
import { Construct } from 'constructs';
import {
    StackProps,
    Stack,
    CfnOutput,
    aws_lambda as lambda,
    aws_apigateway as apigateway,
} from 'aws-cdk-lib'
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class ApiCustomDnsStack extends Stack {
    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        const api = new apigateway.LambdaRestApi(this, 'test-api', {
            domainName: new apigateway.DomainName(this, 'custom-domain-name', {
                domainName: "test.yoloswag.org",
                certificate: null,
            }),
            handler: new lambda.Function(this, 'hello-world-lambda', {
                handler: 'index.handler',
                code: lambda.Code.fromInline(
                    `
                    exports.handler = async (event, context, callback) => {
                        var res = {statusCode: 200, headers: {'Content-Type': "*/*"}, body: "hi"}
                        callback(null, res);
                    };
                    `
                ),
                runtime: lambda.Runtime.NODEJS_16_X,
            })
        });
        new CfnOutput(this, "api-url", { value: api.url })
    }
}
