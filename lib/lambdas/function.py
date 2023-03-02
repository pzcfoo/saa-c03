import boto3


def connect_handler(event, context) -> dict:
    return {
        "isBase64Encoded": False,
        "statusCode": 200,
        "headers": {},
        "body": "",
    }


def disconnect_handler(event, context) -> dict:
    return {
        "isBase64Encoded": False,
        "statusCode": 200,
        "headers": {},
        "body": "",
    }


def onmessage_handler(event, context) -> dict:
    client = boto3.client("apigatewaymanagementapi",
                          endpoint_url="https://bm73qyp6wf.execute-api.us-east-1.amazonaws.com/prod")
    connection_id: str = event["requestContext"]["connectionId"]

    client.post_to_connection(
        ConnectionId=connection_id, Data="hi"
    )
