from fastapi import FastAPI
from src.routers import health

app = FastAPI(title="AI-Devkit API", version="0.1.0")

app.include_router(health.router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
