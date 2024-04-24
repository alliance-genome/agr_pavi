from fastapi import FastAPI

app = FastAPI()

@app.get("/")
async def help_msg():
    return {"help": "Welcome to the PAVI API! For more information on how to use it, see the docs at {host}/docs"}
