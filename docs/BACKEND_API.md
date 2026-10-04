# Backend API

## Health

### GET /health

Returns a simple service health response.

## Root

### GET /

Returns a basic backend availability message.

## Extending the API

When adding an endpoint:

1. Validate request input.
2. Keep database access in the appropriate service or data layer.
3. Return predictable JSON.
4. Document authentication requirements.
5. Test success and failure cases.
