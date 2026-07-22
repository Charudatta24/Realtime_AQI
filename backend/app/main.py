from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime
import numpy as np

from app.config import CITIES
from app.simulator import get_simulator
from app.attribution import attribute_sources
from app.forecasting import forecast_grid
from app.enforcement import generate_enforcement_recommendations
from app.advisory import generate_health_advisory
from app.interventions import generate_intervention_recommendations

app = FastAPI(
    title="AI-Powered Urban Air Quality Intelligence API",
    description="Backend for spatial-temporal AQI attribution, forecasting, enforcement, citizen advisory, and AI intervention recommendations.",
    version="2.0.0"
)

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory dispatch and intervention approval stores
active_dispatches = {}
approved_interventions = {}


class DispatchRequest(BaseModel):
    recommendation_id: str
    inspector_name: str
    vehicle_plate: str


class InterventionApproval(BaseModel):
    intervention_id: str
    approved_by: str
    notes: str = ""


# ─────────────────────────────────────────────────────────────────────────────
# ROOT
# ─────────────────────────────────────────────────────────────────────────────
@app.get("/")
def read_root():
    return {"message": "AeroVigil Urban Air Quality Intelligence API v2.0 is running."}


# ─────────────────────────────────────────────────────────────────────────────
# CITIES
# ─────────────────────────────────────────────────────────────────────────────
@app.get("/api/cities")
def get_cities_list():
    """Returns list of configured Indian metros."""
    return {
        "cities": [
            {
                "name": name,
                "lat": details["lat_center"],
                "lon": details["lon_center"],
                "language": details["primary_language"],
                "lang_code": details["lang_code"],
                "sources": details["sources"]
            }
            for name, details in CITIES.items()
        ]
    }


# ─────────────────────────────────────────────────────────────────────────────
# GRID DATA (Live or Forecast scrubbed)
# ─────────────────────────────────────────────────────────────────────────────
@app.get("/api/metrics/grid-data")
def get_grid_data(
    city: str = Query(...),
    time: str = Query(None)
):
    """Retrieves full geospatial matrices and station coordinates for the city."""
    if city not in CITIES:
        raise HTTPException(status_code=400, detail="Invalid city name")
    timestamp = _parse_time(time)
    sim = get_simulator(city)
    return sim.generate_grid_state(timestamp)


# ─────────────────────────────────────────────────────────────────────────────
# SOURCE ATTRIBUTION
# ─────────────────────────────────────────────────────────────────────────────
@app.get("/api/metrics/attribution")
def get_source_attribution(
    city: str = Query(...),
    row: int = Query(..., ge=0, le=9),
    col: int = Query(..., ge=0, le=9),
    time: str = Query(None)
):
    """Attribution shares and confidence score for a specific grid cell."""
    if city not in CITIES:
        raise HTTPException(status_code=400, detail="Invalid city name")
    timestamp = _parse_time(time)
    sim = get_simulator(city)
    state = sim.generate_grid_state(timestamp)
    return attribute_sources(state, row, col)


# ─────────────────────────────────────────────────────────────────────────────
# HYPERLOCAL FORECAST
# ─────────────────────────────────────────────────────────────────────────────
@app.get("/api/metrics/forecast")
def get_hyperlocal_forecast(
    city: str = Query(...),
    hours: int = Query(24),
    time: str = Query(None)
):
    """24 / 48 / 72-hour hyperlocal AQI grid forecast."""
    if city not in CITIES:
        raise HTTPException(status_code=400, detail="Invalid city name")
    if hours not in [24, 48, 72]:
        raise HTTPException(status_code=400, detail="hours must be 24, 48, or 72")
    timestamp = _parse_time(time)
    return forecast_grid(city, timestamp, hours)


# ─────────────────────────────────────────────────────────────────────────────
# ENFORCEMENT PRIORITIES
# ─────────────────────────────────────────────────────────────────────────────
@app.get("/api/metrics/enforcement")
def get_enforcement_priorities(
    city: str = Query(...),
    time: str = Query(None)
):
    """Returns prioritised hotspot grids and recommended enforcement interventions."""
    if city not in CITIES:
        raise HTTPException(status_code=400, detail="Invalid city name")
    timestamp = _parse_time(time)
    sim = get_simulator(city)
    state = sim.generate_grid_state(timestamp)
    recs = generate_enforcement_recommendations(state)
    for r in recs:
        rec_id = r["id"]
        if rec_id in active_dispatches:
            r["status"] = "Dispatched"
            r["dispatch_details"] = active_dispatches[rec_id]
    return {"recommendations": recs}


# ─────────────────────────────────────────────────────────────────────────────
# CITIZEN ADVISORIES
# ─────────────────────────────────────────────────────────────────────────────
@app.get("/api/metrics/advisories")
def get_citizen_advisory(
    city: str = Query(...),
    row: int = Query(..., ge=0, le=9),
    col: int = Query(..., ge=0, le=9),
    time: str = Query(None)
):
    """Health advisory warnings and vulnerable population details for a cell."""
    if city not in CITIES:
        raise HTTPException(status_code=400, detail="Invalid city name")
    timestamp = _parse_time(time)
    sim = get_simulator(city)
    state = sim.generate_grid_state(timestamp)
    aqi_val = int(state["grid_aqi"][row][col])
    return generate_health_advisory(city, aqi_val, row, col)


# ─────────────────────────────────────────────────────────────────────────────
# AI INTERVENTION RECOMMENDATION ENGINE  ★ NEW
# ─────────────────────────────────────────────────────────────────────────────
@app.get("/api/metrics/interventions")
def get_ai_interventions(
    city: str = Query(..., description="Name of the city"),
    time: str = Query(None, description="ISO timestamp. Defaults to now.")
):
    """
    AI Intervention Recommendation Engine.
    Analyses current AQI + 24/48h forecasts and generates prioritised,
    evidence-backed intervention recommendations for city administrators.
    Each recommendation includes: action, agency, timeline, cost level,
    and expected AQI impact range.
    """
    if city not in CITIES:
        raise HTTPException(status_code=400, detail="Invalid city name")
    timestamp = _parse_time(time)
    sim = get_simulator(city)

    grid_state  = sim.generate_grid_state(timestamp)
    forecast_24 = forecast_grid(city, timestamp, 24)
    forecast_48 = forecast_grid(city, timestamp, 48)

    result = generate_intervention_recommendations(city, grid_state, forecast_24, forecast_48)

    # Enrich with any already-approved interventions
    for iv in result["interventions"]:
        if iv["id"] in approved_interventions:
            iv["status"] = "Approved"
            iv["approved_by"] = approved_interventions[iv["id"]]["approved_by"]

    return result


@app.post("/api/metrics/interventions/approve")
def approve_intervention(req: InterventionApproval):
    """Mark a specific intervention as approved by a city official."""
    approved_interventions[req.intervention_id] = {
        "approved_by": req.approved_by,
        "notes": req.notes,
        "approved_at": datetime.now().isoformat()
    }
    return {"status": "Success", "message": f"Intervention {req.intervention_id} approved by {req.approved_by}."}


# ─────────────────────────────────────────────────────────────────────────────
# INSPECTOR DISPATCH
# ─────────────────────────────────────────────────────────────────────────────
@app.post("/api/dispatch")
def post_dispatch_inspector(req: DispatchRequest):
    """Simulate dispatching inspectors / water sprinklers to a hotspot."""
    active_dispatches[req.recommendation_id] = {
        "inspector": req.inspector_name,
        "vehicle": req.vehicle_plate,
        "dispatched_at": datetime.now().isoformat()
    }
    return {
        "status": "Success",
        "message": f"Inspector {req.inspector_name} dispatched in vehicle {req.vehicle_plate}."
    }


# ─────────────────────────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────────────────────────
def _parse_time(time_str):
    if time_str:
        try:
            return datetime.fromisoformat(time_str)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid ISO timestamp format")
    return datetime.now()
