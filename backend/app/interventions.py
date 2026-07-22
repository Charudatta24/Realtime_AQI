"""
AI Intervention Recommendation Engine
Converts forecast AQI + source attribution into specific, actionable city interventions.
Each recommendation includes: action text, category, expected AQI impact, timeline, and cost.
"""
import numpy as np
import math
from datetime import datetime, timedelta
from app.config import CITIES, GRID_ROWS, GRID_COLS


# --- Intervention templates per source category ---

TRAFFIC_INTERVENTIONS = [
    {
        "action": "Impose Odd-Even vehicle rationing on all major arterial corridors",
        "aqi_impact": (-20, -30),
        "timeline": "Next morning, 6AM–10AM & 5PM–9PM",
        "cost_level": "Low",
        "agency": "Traffic Police + Transport Dept",
        "icon": "🚗",
    },
    {
        "action": "Increase Metro/BRTS frequency by 25% to reduce private vehicle trips",
        "aqi_impact": (-10, -18),
        "timeline": "Immediate — next service cycle",
        "cost_level": "Medium",
        "agency": "Metro Rail Corporation",
        "icon": "🚇",
    },
    {
        "action": "Ban diesel trucks >10T from city limits between 6AM–10PM",
        "aqi_impact": (-15, -22),
        "timeline": "Effective from midnight tonight",
        "cost_level": "Low",
        "agency": "Traffic Police",
        "icon": "🚛",
    },
    {
        "action": "Deploy ANPR cameras at entry points to enforce BS-IV vehicle ban",
        "aqi_impact": (-8, -14),
        "timeline": "24-hour deployment window",
        "cost_level": "Medium",
        "agency": "Municipal Corporation + Traffic Police",
        "icon": "📷",
    },
]

CONSTRUCTION_INTERVENTIONS = [
    {
        "action": "Mandate 24/7 operation of anti-dust nets at all active construction sites",
        "aqi_impact": (-12, -18),
        "timeline": "Immediate enforcement",
        "cost_level": "Low",
        "agency": "Municipal Engineering Dept",
        "icon": "🏗️",
    },
    {
        "action": "Suspend open excavation and demolition activities until AQI < 200",
        "aqi_impact": (-15, -25),
        "timeline": "24–48 hours",
        "cost_level": "High (economic impact)",
        "agency": "Urban Development Authority",
        "icon": "⛔",
    },
    {
        "action": "Deploy water-sprinkling tankers to active construction zones every 3 hours",
        "aqi_impact": (-8, -12),
        "timeline": "Immediate — rolling schedule",
        "cost_level": "Medium",
        "agency": "Fire & Emergency Services",
        "icon": "💧",
    },
]

INDUSTRIAL_INTERVENTIONS = [
    {
        "action": "Issue 'Pollution Emergency Order': Shut high-emission industrial units in Red Zones for 48h",
        "aqi_impact": (-25, -40),
        "timeline": "48 hours commencing at 00:00 IST",
        "cost_level": "Very High (industrial output loss)",
        "agency": "State Pollution Control Board",
        "icon": "🏭",
    },
    {
        "action": "Mandate stack scrubber activation and emergency emission audits at all registered units",
        "aqi_impact": (-10, -20),
        "timeline": "12 hours notice",
        "cost_level": "Medium",
        "agency": "CPCB Regional Office",
        "icon": "🔬",
    },
    {
        "action": "Enforce temporary shift of coal-fired boilers to natural gas for 72 hours",
        "aqi_impact": (-18, -28),
        "timeline": "72-hour operational window",
        "cost_level": "High",
        "agency": "State Pollution Control Board",
        "icon": "♻️",
    },
]

BIOMASS_INTERVENTIONS = [
    {
        "action": "Deploy satellite-guided rapid response teams to all detected fire hotspots",
        "aqi_impact": (-20, -35),
        "timeline": "Immediate dispatch — ETA 30 minutes",
        "cost_level": "Medium",
        "agency": "Fire Department + Pollution Board",
        "icon": "🔥",
    },
    {
        "action": "Issue Emergency Advisory: Zero tolerance on open waste burning in all wards",
        "aqi_impact": (-8, -15),
        "timeline": "Immediate public broadcast",
        "cost_level": "Low",
        "agency": "Municipal Solid Waste Dept",
        "icon": "📢",
    },
    {
        "action": "Activate biomass burning patrol units in agricultural fringe zones",
        "aqi_impact": (-12, -20),
        "timeline": "Dawn patrol starting 4AM",
        "cost_level": "Low",
        "agency": "Agricultural Dept + Revenue Officers",
        "icon": "🌾",
    },
]

MITIGATION_INTERVENTIONS = [
    {
        "action": "Deploy anti-smog guns at {zone} intersections — continuous misting schedule",
        "aqi_impact": (-5, -10),
        "timeline": "Immediately — 4-hour cycles",
        "cost_level": "Medium",
        "agency": "Municipal Corporation",
        "icon": "💨",
    },
    {
        "action": "Mechanised road sweeping on all arterial roads and flyover underpasses",
        "aqi_impact": (-4, -8),
        "timeline": "Next maintenance cycle — 3AM",
        "cost_level": "Low",
        "agency": "PWD / NHAI",
        "icon": "🧹",
    },
    {
        "action": "Emergency water sprinkling by helicopter/drone in densely populated zones",
        "aqi_impact": (-6, -10),
        "timeline": "Daylight hours — 3 sorties",
        "cost_level": "High",
        "agency": "Fire Department + Aviation",
        "icon": "🚁",
    },
]

ADVISORY_INTERVENTIONS = [
    {
        "action": "Issue public WFH advisory for all government offices for 2 days",
        "aqi_impact": (-12, -18),
        "timeline": "Next business day",
        "cost_level": "Low",
        "agency": "Chief Secretary's Office",
        "icon": "🏠",
    },
    {
        "action": "Close all primary schools and shift to online classes until AQI < 150",
        "aqi_impact": (-3, -5),
        "timeline": "Effective tomorrow morning",
        "cost_level": "Low",
        "agency": "Education Department",
        "icon": "🏫",
    },
    {
        "action": "Broadcast public health advisory on All India Radio and regional TV channels",
        "aqi_impact": (0, 0),  # Advisory only
        "timeline": "Within 1 hour",
        "cost_level": "Very Low",
        "agency": "Health Dept + Doordarshan",
        "icon": "📻",
    },
]


def generate_intervention_recommendations(
    city_name: str,
    grid_state: dict,
    forecast_24h: dict,
    forecast_48h: dict
) -> dict:
    """
    Main entry point — generates a full set of AI intervention recommendations.
    """
    aqi_grid_now = np.array(grid_state["grid_aqi"])
    aqi_grid_24h = np.array(forecast_24h["grid_aqi"])
    aqi_grid_48h = np.array(forecast_48h["grid_aqi"])

    avg_aqi_now = float(np.mean(aqi_grid_now))
    avg_aqi_24h = float(np.mean(aqi_grid_24h))
    avg_aqi_48h = float(np.mean(aqi_grid_48h))

    # Find worst hotspot cell
    hotspot_flat_idx = int(np.argmax(aqi_grid_now))
    hotspot_r = hotspot_flat_idx // GRID_COLS
    hotspot_c = hotspot_flat_idx % GRID_COLS
    hotspot_aqi = int(aqi_grid_now[hotspot_r, hotspot_c])

    meteo = grid_state["meteorology"]
    fires = grid_state.get("satellite_fires", [])
    construction = grid_state.get("construction_sites", [])
    industries = grid_state.get("industries", [])
    highways = grid_state.get("highways", [])

    # --- Compute source weights for decision logic ---
    traffic_presence = len(highways) > 5
    fire_presence = len(fires) > 0
    construction_presence = len(construction) > 0
    industrial_presence = len(industries) > 0

    # Severity bucket
    if avg_aqi_now <= 100:
        severity = "Satisfactory"
    elif avg_aqi_now <= 200:
        severity = "Moderate"
    elif avg_aqi_now <= 300:
        severity = "Poor"
    elif avg_aqi_now <= 400:
        severity = "Very Poor"
    else:
        severity = "Severe"

    # Trend analysis
    trend = "Worsening" if avg_aqi_24h > avg_aqi_now * 1.05 else (
        "Improving" if avg_aqi_24h < avg_aqi_now * 0.95 else "Stable"
    )

    interventions = []

    # --- Select interventions based on evidence ---

    # 1. Traffic interventions (always relevant for Indian cities)
    if avg_aqi_now > 150 or avg_aqi_24h > 150:
        _add(interventions, TRAFFIC_INTERVENTIONS[0], avg_aqi_now, "Traffic Management", priority=1 if avg_aqi_now > 200 else 2)
        _add(interventions, TRAFFIC_INTERVENTIONS[1], avg_aqi_now, "Traffic Management", priority=2)
    if avg_aqi_now > 200:
        _add(interventions, TRAFFIC_INTERVENTIONS[2], avg_aqi_now, "Traffic Management", priority=1)

    # 2. Construction interventions
    if construction_presence and avg_aqi_now > 150:
        _add(interventions, CONSTRUCTION_INTERVENTIONS[0], avg_aqi_now, "Construction Control", priority=2)
    if construction_presence and avg_aqi_now > 250:
        _add(interventions, CONSTRUCTION_INTERVENTIONS[1], avg_aqi_now, "Construction Control", priority=1)
    if construction_presence:
        _add(interventions, CONSTRUCTION_INTERVENTIONS[2], avg_aqi_now, "Construction Control", priority=3)

    # 3. Industrial interventions
    if industrial_presence and avg_aqi_now > 200:
        _add(interventions, INDUSTRIAL_INTERVENTIONS[0], avg_aqi_now, "Industrial Control", priority=1)
        _add(interventions, INDUSTRIAL_INTERVENTIONS[1], avg_aqi_now, "Industrial Control", priority=2)
    if industrial_presence and avg_aqi_now > 300:
        _add(interventions, INDUSTRIAL_INTERVENTIONS[2], avg_aqi_now, "Industrial Control", priority=1)

    # 4. Biomass / fire interventions
    if fire_presence:
        _add(interventions, BIOMASS_INTERVENTIONS[0], avg_aqi_now, "Fire & Biomass", priority=1)
        _add(interventions, BIOMASS_INTERVENTIONS[1], avg_aqi_now, "Fire & Biomass", priority=2)
    if city_name == "Delhi" and datetime.now().month in [10, 11]:
        _add(interventions, BIOMASS_INTERVENTIONS[2], avg_aqi_now, "Fire & Biomass", priority=1)

    # 5. Active mitigation
    if avg_aqi_now > 150:
        smog_gun = dict(MITIGATION_INTERVENTIONS[0])
        smog_gun["action"] = smog_gun["action"].format(
            zone=f"Ward ({hotspot_r},{hotspot_c}) and adjacent roads"
        )
        _add(interventions, smog_gun, avg_aqi_now, "Active Mitigation", priority=2)
    if avg_aqi_now > 100:
        _add(interventions, MITIGATION_INTERVENTIONS[1], avg_aqi_now, "Active Mitigation", priority=3)

    # 6. Public advisories
    if avg_aqi_now > 200:
        _add(interventions, ADVISORY_INTERVENTIONS[0], avg_aqi_now, "Public Advisory", priority=2)
        _add(interventions, ADVISORY_INTERVENTIONS[2], avg_aqi_now, "Public Advisory", priority=2)
    if avg_aqi_now > 300:
        _add(interventions, ADVISORY_INTERVENTIONS[1], avg_aqi_now, "Public Advisory", priority=1)

    # Sort by priority ascending (1 = most urgent)
    interventions.sort(key=lambda x: x["priority"])

    # Compute cumulative expected AQI impact
    total_impact_min = sum(iv["impact_range"][0] for iv in interventions)
    total_impact_max = sum(iv["impact_range"][1] for iv in interventions)
    projected_aqi_min = max(50, avg_aqi_now + total_impact_min)
    projected_aqi_max = max(50, avg_aqi_now + total_impact_max)

    return {
        "city": city_name,
        "generated_at": datetime.now().isoformat(),
        "current_summary": {
            "avg_aqi": round(avg_aqi_now),
            "hotspot_aqi": hotspot_aqi,
            "hotspot_cell": {"row": hotspot_r, "col": hotspot_c},
            "severity": severity,
            "trend": trend,
            "wind_speed_kmh": meteo["wind_speed"],
            "wind_dir": meteo["wind_direction"],
            "mixing_height_m": meteo["mixing_height"],
        },
        "forecast_summary": {
            "avg_aqi_24h": round(avg_aqi_24h),
            "avg_aqi_48h": round(avg_aqi_48h),
        },
        "interventions": interventions,
        "impact_summary": {
            "intervention_count": len(interventions),
            "projected_aqi_reduction_min": abs(total_impact_min),
            "projected_aqi_reduction_max": abs(total_impact_max),
            "projected_aqi_after_min": round(projected_aqi_min),
            "projected_aqi_after_max": round(projected_aqi_max),
        },
    }


def _add(lst, template, current_aqi, category, priority):
    """Helper: create a full intervention record from a template."""
    impact_min, impact_max = template["aqi_impact"]
    # Scale impact slightly with AQI severity
    scale = max(1.0, current_aqi / 200.0)
    lst.append({
        "id": f"int_{len(lst)+1:03d}",
        "priority": priority,
        "priority_label": {1: "Critical", 2: "High", 3: "Medium"}.get(priority, "Low"),
        "category": category,
        "icon": template["icon"],
        "action": template["action"],
        "agency": template["agency"],
        "timeline": template["timeline"],
        "cost_level": template["cost_level"],
        "impact_range": (round(impact_min * scale), round(impact_max * scale)),
        "impact_label": f"{abs(round(impact_min * scale))}–{abs(round(impact_max * scale))} AQI pts ↓",
        "status": "Pending Approval",
    })
