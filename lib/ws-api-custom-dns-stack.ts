
const path = require("path");
import { Construct } from 'constructs';
import {
    StackProps,
    Stack,
    CfnOutput,
    aws_route53_targets as targets,
    aws_route53 as r53,
    aws_certificatemanager as acm,
    aws_lambda as lambda,
    aws_apigateway as apigateway,
} from 'aws-cdk-lib'
import { WebSocketApi, WebSocketStage } from "@aws-cdk/aws-apigatewayv2-alpha";
import { WebSocketLambdaIntegration } from "@aws-cdk/aws-apigatewayv2-integrations-alpha";


export class WsApiCustomDnsStack extends Stack {
    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        const hostedZone = r53.HostedZone.fromLookup(this, 'test-hosted-zone', { domainName: 'yoloswag.org' });

        // create certificate
        //const cert = new acm.Certificate(this, 'test-cert', {
        //    domainName: 'test.yoloswag.org',
        //    validation: acm.CertificateValidation.fromDns(hostedZone),
        //});

        const connectHandler = new lambda.Function(this, 'connect-handler', {
            runtime: lambda.Runtime.PYTHON_3_9,
            handler: 'function.connect_handler',
            code: lambda.Code.fromAsset(path.join("lib", "lambdas"))
        });

        const disconnectHandler = new lambda.Function(this, 'disconnect-handler', {
            runtime: lambda.Runtime.PYTHON_3_9,
            handler: 'function.disconnect_handler',
            code: lambda.Code.fromAsset(path.join("lib", "lambdas"))
        });

        const onMessageHandler = new lambda.Function(this, 'onmessage-handler', {
            runtime: lambda.Runtime.PYTHON_3_9,
            handler: 'function.onmessage_handler',
            code: lambda.Code.fromAsset(path.join("lib", "lambdas"))
        });

        const websocketApi = new WebSocketApi(this, "test-ws-api-gateway", {
            connectRouteOptions: {
                integration: new WebSocketLambdaIntegration("connect-integration", connectHandler),
            },
            disconnectRouteOptions: {
                integration: new WebSocketLambdaIntegration("disconnect-integration", disconnectHandler),
            },
        });
        websocketApi.addRoute("message", {
            integration: new WebSocketLambdaIntegration("onmessage-handler", onMessageHandler),
        });

        const deployStage = new WebSocketStage(this, 'test-ws-stage', {
            stageName: "prod",
            autoDeploy: true,
            webSocketApi: websocketApi,
        })
        //new r53.ARecord(this, 'test-a-record', {
        //    zone: hostedZone,
        //    recordName: "test.yoloswag.org",
        //    target: r53.RecordTarget.fromAlias(new targets.ApiGateway(api)),
        //})
        new CfnOutput(this, "api-url", { value: websocketApi.apiEndpoint });
    }
}
