import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "database" in data

def test_create_and_delete_project():
    # Create
    create_res = client.post("/api/projects", json={
        "title": "Pytest Speculative Novel",
        "description": "Created during automated python tests",
        "genre": "Sci-Fi",
        "target_words": 60000
    })
    assert create_res.status_code == 201
    project = create_res.json()
    assert project["title"] == "Pytest Speculative Novel"
    proj_id = project["id"]

    # Delete
    del_res = client.delete(f"/api/projects/{proj_id}")
    assert del_res.status_code == 204
