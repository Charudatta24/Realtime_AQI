import numpy as np
import math
from datetime import datetime
from app.config import GRID_ROWS, GRID_COLS

def attribute_sources(grid_state: dict, r: int, c: int):
    """
    Computes pollution source attribution for a specific grid cell (r, c) 
    given the current simulated grid state.
    """
    meteo = grid_state["meteorology"]
    wind_speed = meteo["wind_speed"]
    wind_dir = meteo["wind_direction"]
    
    # Mathematical wind angle (direction the wind is blowing towards)
    wind_rad = math.radians((270 - wind_dir) % 360)
    wind_dx = math.cos(wind_rad)
    wind_dy = math.sin(wind_rad)
    
    # 1. Traffic attribution factor
    # Proximity to nearest highway
    min_dist_hwy = 999.0
    for h in grid_state["highways"]:
        dist = math.sqrt((r - h["row"])**2 + (c - h["col"])**2)
        if dist < min_dist_hwy:
            min_dist_hwy = dist
    
    # Traffic weights decays with distance
    traffic_weight = math.exp(-0.7 * min_dist_hwy) * 120.0
    # Modulate by diurnal traffic multiplier (represented in simulation)
    # Peak hours have higher traffic weight
    hour = datetime_from_iso(grid_state["timestamp"]).hour
    if 8 <= hour <= 11 or 17 <= hour <= 20:
        traffic_weight *= 1.8
    
    # 2. Industrial attribution factor
    # Sum up contributions from industrial stacks, incorporating wind direction
    industrial_weight = 0.0
    for ind in grid_state["industries"]:
        ind_r, ind_c = ind["row"], ind["col"]
        em = ind["emission"]
        dy = r - ind_r
        dx = c - ind_c
        dist = math.sqrt(dx*dx + dy*dy)
        
        if dist == 0:
            industrial_weight += em
            continue
            
        # Projection along wind direction (upwind vs downwind)
        proj_downwind = (dx * wind_dx) + (dy * wind_dy)
        proj_crosswind = abs((dx * -wind_dy) + (dy * wind_dx))
        
        # Stacks contribute to cells downwind
        if proj_downwind > 0:
            # Gaussian spread width
            sigma = 0.5 * proj_downwind + 0.2
            dispersion = (1.0 / (math.sqrt(2 * math.pi) * sigma)) * math.exp(-(proj_crosswind**2) / (2 * (sigma**2)))
            decay = math.exp(-0.08 * proj_downwind)
            industrial_weight += em * dispersion * decay * 1.5
            
    # 3. Construction dust factor
    construction_weight = 0.0
    for con in grid_state["construction_sites"]:
        con_r, con_c = con["row"], con["col"]
        st = con["strength"]
        dist = math.sqrt((r - con_r)**2 + (c - con_c)**2)
        construction_weight += st * math.exp(-0.8 * dist)
        
    # 4. Biomass / Waste burning factor
    biomass_weight = 0.0
    for fire in grid_state["satellite_fires"]:
        f_r, f_c = fire["row"], fire["col"]
        frp = fire["frp"]
        dist = math.sqrt((r - f_r)**2 + (c - f_c)**2)
        
        # Plume contribution for fires
        dy = r - f_r
        dx = c - f_c
        proj_downwind = (dx * wind_dx) + (dy * wind_dy)
        proj_crosswind = abs((dx * -wind_dy) + (dy * wind_dx))
        
        fire_contrib = frp * 4.0 * math.exp(-0.7 * dist)
        if proj_downwind > 0:
            sigma = 0.6 * proj_downwind + 0.3
            dispersion = (1.0 / (math.sqrt(2 * math.pi) * sigma)) * math.exp(-(proj_crosswind**2) / (2 * (sigma**2)))
            fire_contrib += frp * 3.0 * dispersion * math.exp(-0.12 * proj_downwind)
            
        biomass_weight += fire_contrib
        
    # 5. Background / Secondary Aerosols factor
    # Represents regional PM2.5, sea salt, ambient dust
    bg_weight = float(grid_state["grid_aqi"][r][c]) * 0.3 + 15.0
    
    # Sum all weights
    total_w = traffic_weight + industrial_weight + construction_weight + biomass_weight + bg_weight
    
    # Compute percentages
    p_traffic = (traffic_weight / total_w) * 100.0
    p_industry = (industrial_weight / total_w) * 100.0
    p_construction = (construction_weight / total_w) * 100.0
    p_biomass = (biomass_weight / total_w) * 100.0
    p_bg = (bg_weight / total_w) * 100.0
    
    # Distribute slightly to fit exactly 100%
    shares = [p_traffic, p_industry, p_construction, p_biomass, p_bg]
    total_shares = sum(shares)
    shares = [round((s / total_shares) * 100, 1) for s in shares]
    
    # Adjust last element to sum to exactly 100.0
    shares[-1] = round(100.0 - sum(shares[:-1]), 1)
    
    # Confidence score calculation
    # Confidence increases if cell is closer to monitoring stations (ground-truth anchors)
    min_dist_station = 999.0
    for s in grid_state["stations"]:
        dist = math.sqrt((r - s["row"])**2 + (c - s["col"])**2)
        if dist < min_dist_station:
            min_dist_station = dist
            
    # Baseline confidence starts at 72%, decays if we are far from sensors
    # Max confidence is 96% right on a sensor cell
    confidence = 96.0 - 5.0 * min_dist_station
    # Cap confidence between 65% and 96%
    confidence = max(65.0, min(96.0, confidence))
    
    # Modulate slightly by wind speed (very high winds create turbulence -> lower confidence)
    if wind_speed > 25:
        confidence -= 5.0
    elif wind_speed < 5:
        # stagnant air is easy to model
        confidence += 2.0
        
    confidence = round(confidence, 1)
    
    return {
        "row": r,
        "col": c,
        "aqi": grid_state["grid_aqi"][r][c],
        "pm25": grid_state["grid_pm25"][r][c],
        "pm10": grid_state["grid_pm10"][r][c],
        "attributions": {
            "Vehicular Exhaust": shares[0],
            "Industrial Stacks": shares[1],
            "Construction Dust": shares[2],
            "Biomass & Waste Burning": shares[3],
            "Regional & Secondary Aerosols": shares[4]
        },
        "confidence": confidence
    }

def datetime_from_iso(iso_str: str) -> datetime:
    try:
        return datetime.fromisoformat(iso_str)
    except ValueError:
        # Fallback for older python formats
        return datetime.strptime(iso_str.split(".")[0], "%Y-%m-%dT%H:%M:%S")
