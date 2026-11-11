import pytest


@pytest.fixture(autouse=True)
def usar_evaluador_falso(monkeypatch):
    monkeypatch.setenv("EVALUADOR", "falso")
    # Ajuste registros llm (lote 3): ninguna prueba llama al LLM real, aunque `.env` tenga la clave (la variable vacía
    # manda sobre `.env`); las de integración inyectan `ClientePrueba`.
    monkeypatch.setenv("ANTHROPIC_API_KEY", "")
