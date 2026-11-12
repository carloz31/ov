import pytest


@pytest.fixture(autouse=True)
def sin_llm_real(monkeypatch):
    # Ninguna prueba llama al LLM real, aunque `.env` tenga la clave (la variable vacía
    # manda sobre `.env`); las de integración inyectan `ClientePrueba`.
    monkeypatch.setenv("ANTHROPIC_API_KEY", "")
