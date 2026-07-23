# Padroes de Mock

```typescript
beforeEach(() => {
  mockRepo = { findById: jest.fn(), save: jest.fn() }
  useCase = new XxxUseCase(mockRepo)
})
```
