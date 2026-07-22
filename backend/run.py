import uvicorn
import os

if __name__ == "__main__":
    # Start uvicorn server on port 8000
    print("Starting Air Quality Intelligence backend on https://realtime-aqi-1u9g.onrender.com/")
    uvicorn.run("app.main:app", host="0.0.0.0", port=8080, reload=True)
