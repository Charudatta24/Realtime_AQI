import urllib.request, json

BASE = "http://localhost:8000"
tests = [
    ("Cities List",         "/api/cities"),
    ("Grid Data Delhi",     "/api/metrics/grid-data?city=Delhi"),
    ("Attribution 5,5",     "/api/metrics/attribution?city=Delhi&row=5&col=5"),
    ("Forecast 24h",        "/api/metrics/forecast?city=Delhi&hours=24"),
    ("Enforcement",         "/api/metrics/enforcement?city=Delhi"),
    ("AI Interventions",    "/api/metrics/interventions?city=Delhi"),
]

all_pass = True
for name, path in tests:
    try:
        with urllib.request.urlopen(BASE + path, timeout=45) as r:
            data = json.loads(r.read().decode())
            print(f"  [PASS] {name} -> keys: {list(data.keys())[:4]}")
    except Exception as e:
        print(f"  [FAIL] {name} -> {e}")
        all_pass = False

# POST /api/dispatch
try:
    body = json.dumps({"recommendation_id":"rec_delhi_5_5","inspector_name":"Test Officer","vehicle_plate":"DL-01-TEST"}).encode()
    req = urllib.request.Request(BASE+"/api/dispatch", data=body, headers={"Content-Type":"application/json"})
    with urllib.request.urlopen(req, timeout=10) as r:
        data = json.loads(r.read().decode())
        print(f"  [PASS] Dispatch POST -> {data}")
except Exception as e:
    print(f"  [FAIL] Dispatch POST -> {e}")
    all_pass = False

print()
print("=== ALL TESTS PASSED ===" if all_pass else "=== SOME TESTS FAILED ===")
