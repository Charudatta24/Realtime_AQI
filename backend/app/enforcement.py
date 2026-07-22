import numpy as np
import math
from app.config import GRID_ROWS, GRID_COLS, CITIES
from app.simulator import get_simulator

def generate_enforcement_recommendations(grid_state: dict):
    """
    Analyzes the current grid state and identifies the top 5 pollution hotspots 
    requiring immediate municipal enforcement.
    """
    city_name = grid_state["city"]
    meteo = grid_state["meteorology"]
    aqi_grid = grid_state["grid_aqi"]
    pm10_grid = grid_state["grid_pm10"]
    pm25_grid = grid_state["grid_pm25"]
    
    # Pre-calculate distances to vulnerable centers (hospitals, schools)
    # We will simulate a couple of vulnerable receptors per city
    vulnerable_receptors = _get_vulnerable_receptors(city_name)
    
    hotspots = []
    
    for r in range(GRID_ROWS):
        for c in range(GRID_COLS):
            aqi = aqi_grid[r][c]
            
            # Focus on hotspots (AQI > 120)
            if aqi < 120:
                continue
                
            # Calculate distance to nearest vulnerable receptor
            min_receptor_dist = 999.0
            nearest_receptor_name = "None"
            for v in vulnerable_receptors:
                dist = math.sqrt((r - v["row"])**2 + (c - v["col"])**2)
                if dist < min_receptor_dist:
                    min_receptor_dist = dist
                    nearest_receptor_name = v["name"]
                    
            # 1. Base score from AQI severity
            severity_score = (aqi - 120) * 1.5
            
            # 2. Exposure multiplier (closer to hospital/school = higher risk)
            exposure_bonus = 0.0
            if min_receptor_dist <= 1.5:
                exposure_bonus = 60.0
            elif min_receptor_dist <= 3.0:
                exposure_bonus = 30.0
                
            # 3. Identify potential culprits
            culprit_sources = []
            
            # Check for satellite thermal anomaly (fire) in cell or adjacent
            fire_nearby = False
            fire_frp = 0.0
            for fire in grid_state["satellite_fires"]:
                dist = math.sqrt((r - fire["row"])**2 + (c - fire["col"])**2)
                if dist <= 1.0:
                    fire_nearby = True
                    fire_frp = max(fire_frp, fire["frp"])
            if fire_nearby:
                culprit_sources.append(("Biomass & Waste Burning", 40.0 + fire_frp, "satellite fire detection"))
                
            # Check for construction site
            con_nearby = False
            con_strength = 0
            for con in grid_state["construction_sites"]:
                dist = math.sqrt((r - con["row"])**2 + (c - con["col"])**2)
                if dist <= 1.0:
                    con_nearby = True
                    con_strength = max(con_strength, con["strength"])
            if con_nearby:
                culprit_sources.append(("Construction Dust", 30.0 + con_strength * 0.15, "active permit zone"))
                
            # Check for industrial stack
            ind_nearby = False
            ind_emission = 0
            for ind in grid_state["industries"]:
                dist = math.sqrt((r - ind["row"])**2 + (c - ind["col"])**2)
                if dist <= 1.5:
                    ind_nearby = True
                    ind_emission = max(ind_emission, ind["emission"])
            if ind_nearby:
                culprit_sources.append(("Industrial Emissions", 25.0 + ind_emission * 0.1, "registered stack"))
                
            # Check for highway / traffic
            hwy_nearby = False
            for hwy in grid_state["highways"]:
                dist = math.sqrt((r - hwy["row"])**2 + (c - hwy["col"])**2)
                if dist <= 0.8:
                    hwy_nearby = True
                    break
            if hwy_nearby:
                # Modulated by traffic hour
                culprit_sources.append(("Vehicular Exhaust", 20.0, "roadway density grid"))
                
            if not culprit_sources:
                # Default background / regional accumulation
                culprit_sources.append(("Secondary/Regional Aerosols", 10.0, "ambient dispersion"))
                
            # Select primary source based on highest weight
            culprit_sources.sort(key=lambda x: x[1], reverse=True)
            primary_source = culprit_sources[0][0]
            source_weight = culprit_sources[0][1]
            source_ref = culprit_sources[0][2]
            
            # Calculate final Enforcement Urgency Index (EUI)
            eui = severity_score + exposure_bonus + source_weight
            
            hotspots.append({
                "row": r,
                "col": c,
                "aqi": aqi,
                "pm25": pm25_grid[r][c],
                "pm10": pm10_grid[r][c],
                "eui": round(eui, 1),
                "primary_source": primary_source,
                "source_evidence": source_ref,
                "nearest_receptor": nearest_receptor_name,
                "receptor_dist": round(min_receptor_dist, 1)
            })
            
    # Sort hotspots by EUI descending
    hotspots.sort(key=lambda x: x["eui"], reverse=True)
    
    # Pick top 5 hotspots and build actionable recommendations
    recommendations = []
    for idx, hs in enumerate(hotspots[:5]):
        r, c = hs["row"], hs["col"]
        source = hs["primary_source"]
        
        # Craft smart recommendations based on source and meteorological wind direction
        if source == "Biomass & Waste Burning":
            priority = "Critical" if hs["aqi"] > 200 else "High"
            action = "Dispatch Municipal Solid Waste Fire Patrol for immediate suppression."
            evidence = f"Satellite detected thermal anomaly in cell ({r},{c}). Wind direction ({meteo['wind_direction']}°) carries smoke plume towards {hs['nearest_receptor']} ({hs['receptor_dist']} km away)."
            cost = "Low"
            eta = "15-30 Mins"
        elif source == "Construction Dust":
            priority = "High" if hs["aqi"] > 150 else "Medium"
            action = "Enforce water-sprinkling (anti-smog guns) and fine site manager for uncovered materials."
            evidence = f"PM10 level of {hs['pm10']} µg/m³ recorded in construction grid cell ({r},{c}), violating standard municipal mitigation guidelines near {hs['nearest_receptor']}."
            cost = "Medium"
            eta = "1-2 Hours"
        elif source == "Industrial Emissions":
            priority = "Critical" if hs["aqi"] > 250 else "High"
            action = "Conduct stack emissions audit and enforce compliance with CPCB flue gas cleaning standards."
            evidence = f"Excessive SO₂/NO₂ levels downwind of industrial stack cell ({r},{c}). Current wind speed ({meteo['wind_speed']} km/h) creates dispersion down-cone towards residential sectors."
            cost = "High"
            eta = "24 Hours"
        elif source == "Vehicular Exhaust":
            priority = "High" if hs["aqi"] > 180 else "Medium"
            action = "Deploy traffic police to clear bottleneck corridors and restrict older commercial vehicles."
            evidence = f"Elevated NO₂ concentration of {hs['pm25'] * 2} µg/m³ on arterial road network. Traffic volume multiplier is high."
            cost = "Low"
            eta = "30-45 Mins"
        else:
            priority = "Medium"
            action = "Schedule mechanised road sweeping and dust-suppressant spraying."
            evidence = f"General accumulation of particulate matter in zone cell ({r},{c}) due to low mixing height ({meteo['mixing_height']}m) and stagnant winds."
            cost = "Medium"
            eta = "4 Hours"
            
        recommendations.append({
            "id": f"rec_{city_name.lower()}_{r}_{c}",
            "priority": priority,
            "eui": hs["eui"],
            "row": r,
            "col": c,
            "aqi": hs["aqi"],
            "primary_source": source,
            "action": action,
            "evidence": evidence,
            "cost_level": cost,
            "eta": eta,
            "status": "Pending Dispatch"  # Can be changed by user click in Next.js UI
        })
        
    return recommendations

def _get_vulnerable_receptors(city_name: str):
    # Simulated receptors (Hospitals and Schools) for exposure calculation
    if city_name == "Delhi":
        return [
            {"name": "Metro Children Hospital", "row": 5, "col": 5},
            {"name": "Central Academy Senior School", "row": 4, "col": 4}
        ]
    elif city_name == "Mumbai":
        return [
            {"name": "Tata Memorial Hospital", "row": 6, "col": 5},
            {"name": "Podar International School", "row": 3, "col": 3}
        ]
    elif city_name == "Bengaluru":
        return [
            {"name": "Narayana Health Centre", "row": 5, "col": 4},
            {"name": "Delhi Public School Bengaluru", "row": 7, "col": 6}
        ]
    elif city_name == "Chennai":
        return [
            {"name": "Apollo Speciality Hospital", "row": 4, "col": 5},
            {"name": "Chettinad Vidyashram School", "row": 5, "col": 2}
        ]
    else: # Kolkata
        return [
            {"name": "SSKM Hospital Kolkata", "row": 5, "col": 6},
            {"name": "La Martiniere School for Boys", "row": 4, "col": 5}
        ]
