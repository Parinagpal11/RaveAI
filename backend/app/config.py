from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Provider selection
    llm_provider: str = "ollama"  # ollama | openai | mock
    embedding_provider: str = "ollama"  # ollama | openai | mock

    # OpenAI (optional)
    openai_api_key: str = ""
    openai_model: str = "gpt-4.1-mini"
    openai_embed_model: str = "text-embedding-3-large"

    # Ollama local (free)
    ollama_base_url: str = "http://localhost:11434"
    ollama_chat_model: str = "llama3.1:8b"
    ollama_embed_model: str = "nomic-embed-text"

    chroma_dir: str = "./data/chroma"
    database_url: str = "sqlite:///./rave.db"

    semantic_scholar_api_key: str = ""
    openalex_email: str = ""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", case_sensitive=False)


settings = Settings()
