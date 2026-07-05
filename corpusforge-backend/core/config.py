from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    GEMINI_API_KEY: str
    # gemini-2.0-flash free tier was retired (429, limit 0); 2.5-flash is the free successor
    GEMINI_MODEL: str = "gemini-2.5-flash"
    SUPABASE_URL: str
    SUPABASE_ANON_KEY: str
    FRONTEND_URL: str = "http://localhost:5173"

    class Config:
        env_file = ".env"


settings = Settings()
