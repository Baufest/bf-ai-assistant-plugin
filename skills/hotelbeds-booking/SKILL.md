---
name: hotelbeds-booking
description: Search and book Hotelbeds sandbox hotels or activities with the plugin's hotelbeds MCP server. Use when the user wants a hotel stay or a tour or activity at a destination.
---

# Hotelbeds sandbox booking

Follow the `demo-conventions` skill. Use only the tools of the **hotelbeds** MCP server. Bookings use the Hotelbeds **sandbox**: they are test bookings, nothing is charged, and no payment card is ever requested.

Some deployments expose only hotels or only activities. If a needed tool is missing, say that this capability is not configured.

## Hotels

1. **Collect the search.** Ask for the destination, its country, check-in and check-out dates, and occupancy: rooms, adults per room and the age of each child. Never assume any of them.
2. **Destination.** Call `hotelbeds_resolve_hotel_destination` with the destination text and the two-letter `countryCode`. If several destinations match, list them with "Otro" and let the user choose.
3. **Search.** Call `hotelbeds_search_hotels` with the chosen `destinationCode`, ISO dates and the occupancy groups (combine identical groups into one with a room count). Optionally filter by category if the user asks. If no rates come back, say so and ask which criteria to change.
4. **Choose.** Present hotels and room/board options as a numbered list with price and currency, plus "Otro". Keep the opaque selection tokens internally.
5. **Quote.** Call `hotelbeds_quote_hotel` with the selection token of every occupancy group. Show the result: hotel, rooms, board, dates, guests, total, currency, cancellation policy and any local fees paid at the hotel.
6. **Guests.** Ask for the holder's name and surname and the name, surname and type (adult `AD` or child `CH` with age) of each guest per room. Use the user's data or clearly fictitious data they confirm.
7. **Approve and book.** Show the final summary including guest names and ask for an explicit yes. Then call `hotelbeds_book_hotel` once with the exact `quoteToken`, holder and guests. Report the booking reference and that it is a sandbox booking.

## Activities

1. **Collect the search.** Ask for the destination, its country, the date range and every participant's age.
2. **Destination and search.** Call `hotelbeds_resolve_destination`, let the user choose if needed, then `hotelbeds_search_activities` with `destinationCode`, `from`, `to` and `paxes`. Present the activities as numbered options plus "Otro".
3. **Details.** Call `hotelbeds_get_activity_details` for the chosen activity. If a rate lists `requiredSelections` (session, guide language), ask the user to choose from the returned options and call the tool again with those exact codes. Continue only with a rate where `approvalReady` is true, using the new `selectionToken`.
4. **Holder, participants and answers.** Ask for the holder's title, name, surname, email, international phone (with `+` and country code), address, zip code, address country and whether they consent to email communications (yes or no; never assume it). Then ask for each participant's name and surname and the answer to every returned required question.
5. **First approval: preconfirm.** Show the activity, modality, date, session, participants, price, currency and cancellation terms. Ask explicitly whether to place the temporary hold. After a yes, call `hotelbeds_preconfirm_activity` once with the exact approved `selectionToken` and data.
6. **Second approval: reconfirm.** Show the preconfirmation result and its booking reference. Ask a separate, explicit question to confirm the booking. After a yes, call `hotelbeds_reconfirm_activity` with that `bookingReference`. Report the result as a sandbox booking.

Never reuse a search token for preconfirm, skip a required selection, or chain preconfirm and reconfirm under one approval.
