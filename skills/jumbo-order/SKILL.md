---
name: jumbo-order
description: Build and place a simulated Jumbo supermarket order with the plugin's jumbo MCP server. Use when the user wants groceries from Jumbo, for example rice, tomatoes, meat, dairy or drinks, by unit or by weight.
---

# Simulated Jumbo order

Follow the `demo-conventions` skill. Use only the tools of the **jumbo** MCP server; the chipotle server exposes tools with the same names for a different store.

## Flow

1. **Understand the list.** Split the request into product phrases (for example "arroz", "tomate", "bife"). Ask for any missing quantity. `demo_get_catalog` shows illustrative categories and products, not stock or prices.
2. **Search.** Call `commerce_search_products` once per phrase. Supermarket searches often return several brands or presentations: list them as numbered options with brand, presentation and price, plus "Otro", and let the user choose. Products with `available=false` cannot be ordered.
3. **Quantities.** Respect each product's `orderUnit`:
   - `unit`: quantity is a number of units.
   - `gram`: quantity is in grams. Convert what the user says ("1 kg" → `1000`, "medio kilo" → `500`) and confirm the conversion when it is not obvious.
   Keep within the returned min, max and step. If the requested amount does not fit, explain the closest valid values and ask.
4. **Quote.** Call `commerce_quote_order` with every line together (exact `productId`, `quantity`, `modifierIds` only when the product has modifier groups the user chose).
5. **Approve.** Show the quote summary (products, brands, quantities with units, prices, total, currency) and say it is a simulated order. Ask: "¿Confirmás el pedido simulado?" Wait for an explicit yes.
6. **Place.** Call `commerce_place_order` once with the exact approved `quoteToken`. Report the `orderReference`; nothing is charged or delivered.

Any change after the quote needs a new quote and a new approval. Use `commerce_get_order` to show an order already placed in this conversation.
