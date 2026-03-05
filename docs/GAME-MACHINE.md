# Game Machine Module

This document outlines the API endpoints and services responsible for the game flow, specifically focusing on AI-based question generation.

## Generate Questions (`POST /game/generate-questions`)

This endpoint is responsible for communicating with the Groq AI API (`llama3-8b-8192` model) to generate a customized set of 20 unique trivia questions.

To ensure varied gameplay, the client can provide a list of previously asked questions. The AI is specifically prompted to avoid generating questions that are identical or highly similar to the provided list.

### Requirements

- **Authentication**: Required (`Bearer Token`)
- **Headers**:

  ```http
  Authorization: Bearer <your_jwt_token>
  Content-Type: application/json
  ```

### Request Payload

The request body allows an optional array of strings representing questions that have already been presented to the user.

```json
{
  "previousQuestions": [
    "What does 'HODL' stand for in the cryptocurrency community?",
    "Who is the pseudonymous creator of Bitcoin?",
    "Which mechanism does Ethereum currently use for consensus?"
  ],
  "level": 75
}
```

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `previousQuestions` | `string[]` | No | A list of previously generated questions to avoid duplicating topics. |
| `level` | `number` (1–100) | No | Difficulty level. Defaults to `1`. Higher values produce more obscure, technical, and nuanced questions. |

### Successful Response (`200 OK`)

The endpoint returns exactly 20 trivia questions in an array format. Each question includes four multiple-choice options and the correct answer string.

```json
{
  "success": true,
  "count": 20,
  "data": [
    {
      "question": "What was the first decentralized cryptocurrency ever created?",
      "options": [
        "Ethereum",
        "Bitcoin",
        "Litecoin",
        "Ripple"
      ],
      "correctAnswer": "Bitcoin"
    },
    {
      "question": "What is the maximum supply limit of Bitcoin?",
      "options": [
        "18 million",
        "21 million",
        "50 million",
        "No limit"
      ],
      "correctAnswer": "21 million"
    }
  ]
}
```

### Error Responses

#### Validation Error (`400 Bad Request`)

Returned if the `previousQuestions` field is provided but is not an array of strings.

```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "field": "body.previousQuestions",
      "message": "Expected array, received string"
    }
  ]
}
```

#### Unauthorized Error (`401 Unauthorized`)

Returned if the request is missing a valid JWT token in the `Authorization` header.

```json
{
  "success": false,
  "error": "No token provided"
}
```

#### AI Formatting Error (`500 Internal Server Error`)

Returned if Groq's API responds with an invalid JSON format that cannot be parsed by the server.

```json
{
  "success": false,
  "error": "Invalid response format from AI. Please try again."
}
```

---

## Game Service Layer (`src/game/game.service.ts`)

The raw logic handling the interaction with Groq is abstracted in the `GameService` class.

### `GameService.generateQuestions(previousQuestions: string[])`

- Takes the array of previous questions.
- Constructs a strict system prompt.
- Appends the previous questions to the system prompt if they exist, warning the AI to avert generating duplicate topics.
- Sends a prompt with `response_format: { type: 'json_object' }` to force consistent JSON arrays from the generation mechanism.
- Parses the AI response, cleans it up, and returns a verified array of 20 question objects to the controller.

---

## Update User Points (`POST /game/add-to-user-points`)

Atomically increments a user's `points` by the specified amount.

### Requirements

- **Authentication**: Required (`Bearer Token`)

### Request Payload

```json
{
  "points": 50
}
```

### Successful Response (`200 OK`)

Returns the updated user document (specifically the `points` and `skrTokens` fields).

```json
{
  "success": true,
  "data": {
    "points": 150,
    "skrTokens": 0
  }
}
```

---

## Update User Tokens (`POST /game/add-to-user-tokens`)

Atomically increments a user's `skrTokens` by the specified amount.

### Requirements

- **Authentication**: Required (`Bearer Token`)

### Request Payload

```json
{
  "tokens": 10
}
```

### Successful Response (`200 OK`)

Returns the updated user document.

```json
{
  "success": true,
  "data": {
    "points": 150,
    "skrTokens": 10
  }
}
```

---

## Update User Points and Tokens (`POST /game/add-to-user-both`)

Atomically increments both a user's `points` and `skrTokens` by the specified amounts in a single database operation.

### Requirements

- **Authentication**: Required (`Bearer Token`)

### Request Payload

```json
{
  "points": 50,
  "tokens": 10
}
```

### Successful Response (`200 OK`)

Returns the updated user document.

```json
{
  "success": true,
  "data": {
    "points": 200,
    "skrTokens": 20
  }
}
```
