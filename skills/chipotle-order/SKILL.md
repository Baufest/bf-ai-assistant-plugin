---
name: chipotle-order
description: Build and place a simulated Chipotle order with the plugin's chipotle connection (Mini Assistant Chipotle). Use when the user wants Chipotle food or drinks, for example burritos, bowls, tacos, sides or sodas.
---

# Simulated Chipotle order

Follow the `demo-conventions` skill. Use only the tools of the **chipotle** connection (Mini Assistant Chipotle); the jumbo connection exposes tools with the same names for a different store.

## Flow

1. **Understand the order.** Split the request into product phrases (for example "burrito carnitas", "diet coke"). Ask for any missing quantity. To show what exists, call `demo_get_catalog`; it is illustrative only, not stock or prices.
2. **Search.** Call `commerce_search_products` once per phrase. If one available product clearly matches, use it. If several match, list them as numbered options with name and price plus "Otro". Products with `available=false` cannot be ordered; say so and offer the alternatives returned.
3. **Modifiers.** For each product with modifier groups, ask the user to choose every required group (and optional ones they want). List the returned modifier labels; never pick them silently.
4. **Quote.** Call `commerce_quote_order` with all lines together: exact `productId`, `quantity` and the chosen `modifierIds`. If it fails validation, explain the reason and ask what to change.
5. **Approve.** Show the quote summary (lines, modifiers, quantities, subtotal, total, currency) and say it is a simulated order. Ask: "¿Confirmás el pedido simulado?" Wait for an explicit yes.
6. **Place.** Call `commerce_place_order` with the exact `quoteToken` of the approved quote, once. Report the `orderReference` and that no payment or delivery happens.

Any change after the quote (items, quantities, modifiers) means a new quote and a new approval. Use `commerce_get_order` to show an order already placed in this conversation.
