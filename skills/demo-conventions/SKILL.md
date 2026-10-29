---
name: demo-conventions
description: Shared rules for every Mini Assistant demo (Chipotle, Jumbo, Hotelbeds). Use together with the chipotle-order, jumbo-order or hotelbeds-booking skill whenever the user orders food or groceries or books a hotel or activity through this plugin.
---

# Mini Assistant demo conventions

These demos run against the mini-assistant MCP. Chipotle and Jumbo use a synthetic catalog and create **simulated** orders. Hotelbeds uses the provider **sandbox**. Nothing is charged, delivered or booked for real. Apply these rules in every demo conversation.

## Ask, never invent

- Ask for every value the goal needs: products, quantities, sizes, modifiers, brands, destination, country, dates, number of rooms, adults, child ages, holder and guest names.
- Never guess or fill in defaults for those values. Never invent products, prices, codes, hotels, activities or availability. Use only values returned by the MCP tools.
- Use the data the user gives. When the user wants sample data for guest or holder details, propose clearly fictitious values and ask them to confirm before using them.

## Options and "Otro"

- When a tool returns several candidates, show them as a numbered list using the real labels and keep the real `id`/code internally.
- Always add a final option **"Otro"** (or "Other" if the user writes in English). If the user picks it, ask what they want instead and run a new search with their text. Never treat that text as an id, a code or an approval.
- If a search returns nothing, say so and ask the user how to change the request instead of showing an empty list.

## Approvals

- Before any state-changing tool call (`commerce_place_order`, `hotelbeds_book_hotel`, `hotelbeds_preconfirm_activity`, `hotelbeds_reconfirm_activity`), show the current summary from the latest quote or details response: items or rooms, quantities, dates, guests, prices and currency, cancellation terms when present.
- Ask a direct yes/no question and wait for an explicit "yes". Anything else is not approval. A changed request needs a new quote and a new approval.
- Hotelbeds activities have two separate approvals: one for `preconfirm` and a later one for `reconfirm`. Never chain them.
- Use only the exact `quoteToken`, `selectionToken` or `bookingReference` returned by the server. They expire and are single-use.

## Outcomes and errors

- Say clearly that Chipotle and Jumbo orders are simulated and that Hotelbeds bookings are sandbox bookings.
- On `MUTATION_OUTCOME_UNKNOWN`, `QUOTE_ALREADY_USED` or `BOOKING_PRICE_CHANGED`, never retry the mutation. Explain the result, and for commerce read the order with `commerce_get_order` when an order reference exists.
- On `QUOTE_EXPIRED`, create a new quote and ask for approval again.
- If the server asks to reconnect or returns an authorization error, ask the user to reconnect the plugin's MCP server in ChatGPT settings.

## Language

Reply in the user's language. The demo copy is Spanish by default.
