# Nailismo iOS (native SwiftUI)

The native iOS client for Nailismo. The Expo/React Native app in `../app` remains
the Android client; this app is iOS-only and shares no runtime code with it —
it mirrors the same brand (the "candy" palette + Fredoka/Nunito) and will reuse
the same Shopify Storefront API and the web app's `/api/scan` + `/api/reviews`
endpoints.

**Status: feature-complete with web parity.** Design system, fonts, and the
6-tab navigation (Home · Shop · **Measure** · Custom · Favorite · Account) with
the raised lime Measure button are in place. Storefront browsing, cart + checkout,
favorites, customer auth, and the camera measure flow are live. The PDP mirrors
the web product page: trust card, sizing, free-ship nudge, the "Press on in 4
steps" guide, per-product FAQ, UGC strip, Shopify recommendations ("You may also
like"), and Judge.me reviews (served via the web `/api/reviews` BFF). Gift cards
and care essentials render the leaner template (`ProductClass`), matching web's
`SimpleProductTemplate`. The **Customize to Order** AI studio is native too:
intake (camera/photo, length/shape/note/email) → $2 Stripe deposit (native
PaymentSheet) → generation polling → 3 views → size → Shopify checkout, plus a
"My designs" history/resume list. It reuses the web `/api/customize/*` BFF.

## Requirements
- Xcode 26+
- [XcodeGen](https://github.com/yonaskolb/XcodeGen): `brew install xcodegen`

## Generate & run
```sh
cd apps/ios
xcodegen generate            # writes Nailismo.xcodeproj (gitignored)
open Nailismo.xcodeproj       # then run on an iOS 17+ simulator
```

Or from the CLI (no code signing needed for the simulator):
```sh
xcodebuild -project Nailismo.xcodeproj -scheme Nailismo \
  -destination 'platform=iOS Simulator,name=iPhone 16' build
```

## Secrets (Pass 2)
Copy `Secrets.example.xcconfig` to `Secrets.xcconfig` (gitignored) and fill the
public Storefront values from `apps/app/.env`. See that file for the key mapping
and the xcconfig `//`-in-URLs caveat.

Also set `STRIPE_PUBLISHABLE_KEY` (the publishable `pk_…` key, same value as the
web's `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`) for the Customize $2 deposit.

## Layout
```
Nailismo/
  App/            NailismoApp (@main) + RootTabView (custom tab bar + Measure FAB)
  DesignSystem/   Theme (candy tokens), Typography, Components/
  Features/       Home, Shop, Measure, Favorites, Account (stubs)
  Resources/      Info.plist, Assets.xcassets, Fonts/ (Fredoka + Nunito)
```
