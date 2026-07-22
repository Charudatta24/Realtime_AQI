from datetime import datetime
from app.forecasting import forecast_grid
from app.attribution import attribute_sources
from app.enforcement import generate_enforcement_recommendations
from app.advisory import generate_health_advisory
from app.simulator import get_simulator


def run_multi_agent_coordinator(city_name: str, timestamp: datetime) -> dict:
    """
    Orchestrates multiple AI agents to provide a coordinated urban air quality intelligence summary.
    """
    sim = get_simulator(city_name)
    state = sim.generate_grid_state(timestamp)

    recommendations = generate_enforcement_recommendations(state)
    primary_hotspot = recommendations[0] if recommendations else None

    if primary_hotspot:
        target_row = primary_hotspot["row"]
        target_col = primary_hotspot["col"]
    else:
        target_row, target_col = 5, 5

    attribution = attribute_sources(state, target_row, target_col)
    advisory = generate_health_advisory(city_name, state["grid_aqi"][target_row][target_col], target_row, target_col)
    forecast = forecast_grid(city_name, timestamp, 24)

    agent_outputs = [
        {
            "agent": "ForecastAgent",
            "role": "Hyperlocal AQI forecasting",
            "summary": "Predicts city-scale 24-hour hyperlocal AQI trends using traffic, meteorology, and local emission drivers.",
            "key_insights": {
                "forecast_hours": 24,
                "model_rmse": forecast["performance"]["model_rmse"],
                "error_reduction_pct": forecast["performance"]["error_reduction_pct"]
            }
        },
        {
            "agent": "AttributionAgent",
            "role": "Explainable pollution attribution",
            "summary": "Computes source shares for a target grid cell and explains the relative impact of traffic, industry, construction, burning, and regional background.",
            "key_insights": {
                "row": attribution["row"],
                "col": attribution["col"],
                "top_source": max(attribution["attributions"], key=attribution["attributions"].get),
                "confidence": attribution["confidence"]
            }
        },
        {
            "agent": "EnforcementAgent",
            "role": "AI-powered intervention planner",
            "summary": "Prioritizes hotspot response actions and generates evidence-backed municipal enforcement recommendations.",
            "key_insights": {
                "top_priority": primary_hotspot["primary_source"] if primary_hotspot else "N/A",
                "top_aqi": primary_hotspot["aqi"] if primary_hotspot else None,
                "top_eui": primary_hotspot["eui"] if primary_hotspot else None
            }
        },
        {
            "agent": "CitizenAdvisorAgent",
            "role": "Multilingual citizen assistant",
            "summary": "Crafts public health advisories in the citys regional language and English, tailored to vulnerable populations.",
            "key_insights": {
                "language": advisory["primary_language"],
                "lang_code": advisory["lang_code"],
                "translated_alert": advisory["translated_alert"]
            }
        }
    ]

    coordinated_plan = [
        "Monitor the top AQI hotspot and validate the primary source attribution.",
        "Use the forecast agent to anticipate near-term wind shifts and traffic peaks.",
        "Deploy enforcement actions near the hotspot while advising vulnerable citizens in the local language.",
        "Simulate intervention scenarios with the digital twin before committing field resources."
    ]

    return {
        "city": city_name,
        "timestamp": timestamp.isoformat(),
        "primary_hotspot": primary_hotspot,
        "agents": agent_outputs,
        "coordinated_plan": coordinated_plan,
        "recommendation_count": len(recommendations),
        "target_cell": {"row": target_row, "col": target_col},
        "top_attribution": attribution["attributions"],
        "multilingual_advice": {
            "english": advisory["advice_en"],
            "regional": advisory["translated_alert"],
            "language": advisory["primary_language"],
            "lang_code": advisory["lang_code"]
        }
    }
