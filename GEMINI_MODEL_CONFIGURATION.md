# Gemini Model Configuration

## Environment Variable Configuration

You can now configure the Gemini model used for analysis by setting the `GEMINI_MODEL` environment variable.

### Default Model

If no `GEMINI_MODEL` environment variable is set, the system will use:
- **Model**: `gemini-2.5-flash-lite-preview-06-17`

### Setting Custom Model

Add the following to your `.env` file:

```bash
GEMINI_MODEL=your-preferred-model-name
```

### Available Models

You can use any of the following Gemini models:

- `gemini-2.5-flash-lite-preview-06-17` (Default - Latest lite preview)
- `gemini-2.5-flash` (Standard flash model)
- `gemini-2.5-pro` (Pro model with advanced capabilities)
- `gemini-1.5-flash` (Previous generation flash)
- `gemini-1.5-pro` (Previous generation pro)

### Example Configuration

```bash
# Use the latest lite preview model (default)
GEMINI_MODEL=gemini-2.5-flash-lite-preview-06-17

# Use the standard flash model
GEMINI_MODEL=gemini-2.5-flash

# Use the pro model for advanced analysis
GEMINI_MODEL=gemini-2.5-pro
```

### Benefits of Different Models

- **Flash Lite Preview**: Fastest response times, optimized for basic analysis
- **Flash**: Good balance of speed and capability
- **Pro**: Advanced reasoning and complex analysis capabilities

### Monitoring

The current model being used is logged during service initialization and can be viewed in the system health checks within the analyze API logs.

### Notes

- Changes to the `GEMINI_MODEL` environment variable require a server restart to take effect
- The lite preview model is recommended for most use cases due to its speed and efficiency
- Pro models may have different rate limits and pricing structures
