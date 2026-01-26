import os

from locust import HttpUser, between, task

# Optional Supabase REST base and anon key to exercise read-heavy endpoints.
SUPABASE_URL = os.getenv("LOCUST_SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("LOCUST_SUPABASE_ANON_KEY")
SUPABASE_REST_URL = f"{SUPABASE_URL.rstrip('/')}/rest/v1" if SUPABASE_URL else None


def supabase_headers():
    if not SUPABASE_ANON_KEY:
        return {}
    return {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
    }


class JobTrackerUser(HttpUser):
    # Default to the local dev server; override with LOCUST_HOST/--host as needed.
    host = os.getenv("LOCUST_WEB_HOST", "http://localhost:3000")
    wait_time = between(1, 3)

    @task(3)
    def landing(self):
        self.client.get("/", name="landing")

    @task(2)
    def login_page(self):
        self.client.get("/login", name="login")

    @task(2)
    def register_page(self):
        self.client.get("/register", name="register")

    @task
    def dashboard_shell(self):
        self.client.get("/app/dashboard", name="dashboard shell")

    @task
    def list_jobs_snapshot(self):
        if not SUPABASE_REST_URL or not SUPABASE_ANON_KEY:
            return
        self.client.get(
            f"{SUPABASE_REST_URL}/jobs?select=id,date,status&order=date.desc&limit=50",
            headers=supabase_headers(),
            name="supabase jobs list",
        )
