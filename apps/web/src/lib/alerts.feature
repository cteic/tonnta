Feature: Alert subscription payloads

  Scenario: A valid browser subscription becomes a subscribe payload
    Given a push subscription with an endpoint and both keys
    When I build the subscribe payload for donabate
    Then the payload carries the endpoint, keys and default thresholds

  Scenario: A subscription missing keys is rejected
    Given a push subscription with an endpoint but no keys
    When I build the subscribe payload for donabate
    Then no payload is produced

  Scenario: A subscription with an empty endpoint is rejected
    Given a push subscription with an empty endpoint
    When I build the subscribe payload for donabate
    Then no payload is produced

  Scenario: Custom thresholds are carried through
    Given a push subscription with an endpoint and both keys
    When I build the subscribe payload with a 0.6m wave threshold
    Then the payload asks for waves of at least 0.6m

  Scenario: The VAPID key decodes to bytes
    Given a url-safe base64 VAPID public key
    When I decode it
    Then I get a byte array matching the key contents

  Scenario: iOS Safari in the browser is told to install first
    Given an iPhone browser without push APIs
    When I detect alert support
    Then support is ios-needs-install

  Scenario: A browser with push APIs is supported
    Given a browser with service worker and push APIs
    When I detect alert support
    Then support is supported
