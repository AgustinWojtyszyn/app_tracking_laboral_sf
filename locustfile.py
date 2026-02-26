from locust import HttpUser, task, between


class AppTrackingUser(HttpUser):
    host = "https://app-tracking-laboral-sf.onrender.com"
    wait_time = between(2, 5)

    @task
    def home(self):
        self.client.get("/", name="GET /")
