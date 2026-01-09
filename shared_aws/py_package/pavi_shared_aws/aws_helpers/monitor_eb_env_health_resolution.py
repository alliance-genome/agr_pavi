import click
from time import sleep

from .eb.eb_environment import get_eb_environment_health


@click.command(context_settings={"show_default": True})
@click.option(
    "--eb_env_name",
    type=click.STRING,
    required=True,
    help="The Elasticbeanstalk environment name to monitor.",
)
@click.option(
    "--timeout",
    type=click.INT,
    required=False,
    default=600,
    help="Timeout (in seconds) to monitor the EB environment health.",
)
@click.option(
    "--interval",
    type=click.INT,
    required=False,
    default=5,
    help="Interval (in seconds) to monitor the EB environment health.",
)
def main(eb_env_name: str, timeout: int, interval: int) -> None:
    """
    Main method to monitor EB environment deployment health.

    Monitors the EB environment health until it is "green" (pass) or "red" (fail).
    """
    attempt_count = 0
    prior_health_status = ""
    while attempt_count * interval < timeout:
        eb_env_health = get_eb_environment_health(environment_name=eb_env_name)
        if eb_env_health["Status"] == "Ok":
            print(
                f"Environment {eb_env_name} became healthy with no operations in progress (status {eb_env_health['Status']}), stopping monitor."
            )
            break
        elif eb_env_health["Color"] == "Red":
            print(
                f"Environment {eb_env_name} became unhealthy ({eb_env_health['Status']}), stopping monitor."
            )
            exit(1)
        else:
            if eb_env_health["Status"] != prior_health_status:
                print(
                    f"Environment {eb_env_name} health status is {eb_env_health['Status']}."
                )
                prior_health_status = eb_env_health["Status"]
            else:
                print("...")

            attempt_count += 1
            sleep(interval)
    else:
        print(
            f"Timeout: environment {eb_env_name} health did not resolve as healthy nor unhealthy within {timeout} seconds."
        )
        exit(1)


if __name__ == "__main__":
    main()
