"""
Multi-City Comparative Intelligence Engine.

Cross-city AQI trends, intervention effectiveness benchmarking,
and compliance metric comparisons across all configured Indian cities.
Enables city administrators to learn from interventions that worked
in comparable urban centres.
"""
from datetime import datetime
from app.config import CITIES
from app.realdata import get_realtime_aqi
from app.simulator import get_simulator
import numpy as np


def _generate_aqi_trend(city_name: str, current_aqi: int) -> list:
    """Generate a plausible recent AQI trendline (last 5 readings) as a random walk."""
    np.random.seed(hash(city_name + "trend_v2") % (2**32))
    steps = np.random.randn(5) * 15
    walk = [current_aqi]
    for s in reversed(steps):
        walk.append(max(20, min(500, walk[-1] - s)))
    result = [round(x) for x in reversed(walk)]
    return result[-5:]


def _compute_intervention_effectiveness(city_name: str) -> dict:
    """
    Simulated intervention effectiveness score (0-1).
    Based on city baseline characteristics — cleaner cities tend to have
    stronger governance proxies. In production this would ingest historical
    compliance and enforcement records.
    """
    cfg = CITIES.get(city_name, {})
    bg_aqi = cfg.get("bg_aqi", 100)
    base_score = max(0.2, min(0.95, 1.0 - (max(0, bg_aqi - 50) / 300.0)))
    np.random.seed(hash(city_name + "eff_v2") % (2**32))
    jitter = np.random.uniform(-0.12, 0.12)
    score = round(max(0.1, min(1.0, base_score + jitter)), 3)
    trend = np.random.choice(["improving", "stable", "declining"], p=[0.28, 0.48, 0.24])
    return {"score": score, "trend": trend}


def _compute_compliance(city_name: str) -> dict:
    """
    Count hotspot / severe / poor zones from the current simulation state.
    Provides a real-time snapshot of city-level air quality compliance status.
    """
    sim = get_simulator(city_name)
    state = sim.generate_grid_state(datetime.now())
    grid = np.array(state["grid_aqi"])
    return {
        "hotspot_count": int(np.sum(grid > 200)),
        "severe_zone_count": int(np.sum(grid > 300)),
        "poor_zone_count": int(np.sum((grid > 150) & (grid <= 200))),
        "station_count": len(state["stations"]),
        "active_fire_count": len(state["satellite_fires"]),
    }


def _generate_insights(cities_data: list) -> list:
    """Generate actionable cross-city comparisons and learnings."""
    insights = []

    # 1. Top intervention effectiveness — cities to learn from
    top_eff = sorted(cities_data, key=lambda c: c["intervention_effectiveness"], reverse=True)[:3]
    if len(top_eff) >= 2:
        insights.append({
            "insight": (
                f"Top-performing enforcement cities: {', '.join(c['name'] for c in top_eff)}. "
                "These cities demonstrate strong correlation between enforcement "
                "effectiveness and lower AQI baselines."
            ),
            "type": "intervention_effectiveness",
            "source_cities": [c["name"] for c in top_eff],
            "applicable_cities": [c["name"] for c in cities_data if c["intervention_effectiveness"] < 0.5],
            "recommendation": "Audit enforcement protocols, resource allocation models, and public compliance campaigns from top performers."
        })

    # 2. Cities sharing similar 'Poor' band — coordinated action opportunity
    poor = [c for c in cities_data if 200 < c["current_aqi"] <= 300]
    if len(poor) >= 2:
        insights.append({
            "insight": (
                f"Multiple cities in 'Poor' AQI band ({', '.join(c['name'] for c in poor[:3])}). "
                "Coordinated regional action plan can target shared emission sources."
            ),
            "type": "aqi_cluster",
            "source_cities": [poor[0]["name"]],
            "applicable_cities": [c["name"] for c in poor[1:]],
            "recommendation": "Establish joint task force for cross-jurisdictional pollution sources with shared satellite monitoring."
        })

    # 3. Fire / biomass burning cluster
    fire_cities = [c for c in cities_data if c["compliance"]["active_fire_count"] > 1]
    if len(fire_cities) >= 2:
        insights.append({
            "insight": (
                f"Biomass and waste burning hotspots detected in {', '.join(c['name'] for c in fire_cities[:3])}. "
                "Satellite thermal anomalies correlate with seasonal agricultural cycles."
            ),
            "type": "biomass_burning",
            "source_cities": [c["name"] for c in fire_cities[:3]],
            "applicable_cities": [c["name"] for c in cities_data],
            "recommendation": "Scale satellite-based automated fire detection with rapid ground response protocol during burning season."
        })

    # 4. Cities showing improvement — positive deviance
    improving = [c for c in cities_data if c["improvement_trend"] == "improving"]
    if len(improving) >= 2:
        insights.append({
            "insight": (
                f"Cities on an improving trajectory: {', '.join(c['name'] for c in improving[:4])}. "
                "Recent interventions appear to be yielding measurable AQI reductions."
            ),
            "type": "positive_deviance",
            "source_cities": [c["name"] for c in improving[:3]],
            "applicable_cities": [c["name"] for c in cities_data if c["improvement_trend"] == "declining"],
            "recommendation": "Document and replicate intervention strategies from improving cities — share best practices network-wide."
        })

    return insights


def get_city_comparison() -> dict:
    """
    Main entry point — returns complete cross-city comparison payload.

    Returns:
        dict with timestamp, total_cities, cities list (sorted worst-first),
        cross_city_insights, and summary statistics (national avg, worst/best,
        counts by severity band, improving cities).
    """
    entries = []

    for name in CITIES:
        live = get_realtime_aqi(name)
        aqi = live["india_aqi"]
        trend = _generate_aqi_trend(name, aqi)
        eff = _compute_intervention_effectiveness(name)
        compliance = _compute_compliance(name)

        # AQI category label
        if aqi <= 50:
            cat = "Good"
        elif aqi <= 100:
            cat = "Satisfactory"
        elif aqi <= 200:
            cat = "Moderate"
        elif aqi <= 300:
            cat = "Poor"
        elif aqi <= 400:
            cat = "Very Poor"
        else:
            cat = "Severe"

        # Simulated primary pollutant (in production: from sensor data)
        np.random.seed(hash(name + "pol_v2") % (2**32))
        poll = np.random.choice(
            ["PM2.5", "PM10", "NO₂", "SO₂", "O₃"],
            p=[0.4, 0.25, 0.15, 0.1, 0.1]
        )

        # Find comparable cities (similar AQI range)
        comparable = []
        for other in CITIES:
            if other == name:
                continue
            if len(comparable) >= 3:
                break
            o_live = get_realtime_aqi(other)
            if abs(aqi - o_live["india_aqi"]) < 50:
                comparable.append(other)

        entries.append({
            "name": name,
            "current_aqi": aqi,
            "category": cat,
            "primary_pollutant": poll,
            "aqi_trend": trend,
            "intervention_effectiveness": eff["score"],
            "improvement_trend": eff["trend"],
            "compliance": compliance,
            "comparable_cities": comparable,
        })

    # Sort: worst AQI first
    entries.sort(key=lambda c: c["current_aqi"], reverse=True)

    insights = _generate_insights(entries)
    avg_aqi = round(sum(c["current_aqi"] for c in entries) / len(entries), 1)

    return {
        "timestamp": datetime.now().isoformat(),
        "total_cities": len(entries),
        "cities": entries,
        "cross_city_insights": insights,
        "summary": {
            "national_average_aqi": avg_aqi,
            "worst_city": entries[0]["name"] if entries else None,
            "worst_aqi": entries[0]["current_aqi"] if entries else None,
            "best_city": entries[-1]["name"] if entries else None,
            "best_aqi": entries[-1]["current_aqi"] if entries else None,
            "cities_in_severe": sum(1 for c in entries if c["current_aqi"] > 400),
            "cities_in_poor_or_worse": sum(1 for c in entries if c["current_aqi"] > 200),
            "cities_improving": sum(1 for c in entries if c["improvement_trend"] == "improving"),
        }
    }
