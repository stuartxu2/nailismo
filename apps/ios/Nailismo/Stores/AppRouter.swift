import Observation

// App-level UI routing that isn't tab/stack navigation — currently just the cart
// sheet, presented from any header bag button.
@MainActor
@Observable
final class AppRouter {
    var showCart = false
}
