import {
  webhookIngressHealthHeader,
  webhookIngressHealthValue,
} from "@/features/channels/webhooks/webhook-ingress-health";

export const dynamic = "force-dynamic";

export function GET() {
  return new Response(null, {
    headers: {
      "Cache-Control": "no-store",
      [webhookIngressHealthHeader]: webhookIngressHealthValue,
    },
    status: 204,
  });
}
