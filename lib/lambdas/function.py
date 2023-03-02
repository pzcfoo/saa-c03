
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
    return {'statusCode': 200, 'body': "message received"}
