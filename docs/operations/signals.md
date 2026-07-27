# Production signals

## RED baseline

| Signal | Initial alert |
|---|---|
| Rate | 5-minute request rate deviates 50% from 7-day same-hour baseline |
| Errors | HTTP 5xx > 2% for 5 minutes; page at > 5% |
| Duration | p95 > 1 second for 10 minutes; page at > 2 seconds |
| Readiness | `/api/health/ready` fails twice; remove instance from traffic |
| Liveness | `/api/health/live` fails twice; restart instance |

Dashboard by route and status. Exclude health traffic from application rate. Correlate JSON logs using `requestId`; expose no credentials or personal data. Review thresholds weekly until 30 days of baseline exists.
