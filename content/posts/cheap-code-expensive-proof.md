---
title: "Code is cheap, proof is expensive"
date: 2026-11-20
draft: false
tags: ["testing", "ai", "mutation-testing"]
summary: "Writing code got cheap. Proof that it does what it should did not."
---

In software development, writing code went from the slowest activity to the fastest, so quickly that we barely have time to notice.
An agent produces an 800-line diff in two minutes, and I then spend an hour doing what I always wanted to do instead of programming: reading someone else's code.
I have come across the opinion that code no longer matters. I think the exact opposite: software still wears the same coat, it is just sewn by machines now. But since nobody reads code these days, the proof that it does what it should matters far more.

## Everything is green

An agent writes tests with the same enthusiasm as the implementation. And they are gorgeous:

```kotlin
@Test
fun `calculates discount`() {
    val result = service.discountFor(order)
    assertNotNull(result)
}
```

A discount? It's there! 5% or 500%? Accounting's problem.
Coverage? All of it. Sonar? Happy.

{{< image src="img/what-a-beautiful-pigeon.jpg" alt="The Is this a pigeon? meme: a man points at a butterfly labelled ASSERT-NOT-NULL and says What a beautiful pigeon" >}}

Coverage measures where the code went, not whether anyone noticed what it did there. It is an attendance system, not a performance review.

For the latter there is **mutation testing**. [Pitest](https://pitest.org/) quietly changes `>=` to `>`, returns a different value, removes a call, and runs the tests again.
If they stay green, the mutant survived and your test is decoration at that spot. It is the only metric I know that **tests the tests**. It is also the only report that made me feel worse than a code review.

## Mocks that test mocks

When the implementation is cheap, it gets rewritten more often. A unit test that spends half a page setting up mocks and then verifies that the mock returned what we told it to return gets thrown away with it. Nobody misses it.

A test that sends a request and looks at the response knows nothing about the internals. It survives a refactoring, a rewrite, and the Tuesday when the agent decides the whole thing should work differently.

That is why in a review I read the **scenarios** first, and only then the code. Nobody reads eight hundred lines line by line, and whoever claims they do is lying.

## The point

Judgment has not left programming.

It moved from *"how do I write this"* to *"what is actually supposed to come out"*.

Anyone with a subscription can write fast today. Another agent will review the tests. But someone still has to tell it whether the discount should be 5% or 500%.
