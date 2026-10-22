Feature: Pro entitlement rails

  Scenario: An unused token before expiry is valid
    Given a magic token expiring in 10 minutes
    When I validate it now
    Then the token is accepted

  Scenario: An expired token is rejected
    Given a magic token that expired 1 minute ago
    When I validate it now
    Then the token is rejected

  Scenario: A used token is rejected even before expiry
    Given a magic token expiring in 10 minutes that was already used
    When I validate it now
    Then the token is rejected

  Scenario: Founder remaining counts down from the cap
    Given 37 founder purchases
    When I compute the remaining founder slots
    Then 63 slots remain

  Scenario: Founder remaining never goes below zero
    Given 250 founder purchases
    When I compute the remaining founder slots
    Then 0 slots remain

  Scenario: Token comparison accepts only an exact match
    Given a stored token
    When I compare it against itself and against a near-miss
    Then only the exact match is accepted

  Scenario: A valid email is normalised for restore
    Given a restore request for " Pete@CTEIC.ie "
    When I parse the restore body
    Then the email is pete@cteic.ie

  Scenario: A junk restore payload is rejected
    Given a restore request without a usable email
    When I parse the restore body
    Then no restore email is produced

  Scenario: Two requests with one restore link link only one device
    Given a Pro purchase, a fresh restore link and two devices with alerts on
    When both devices open the link at the same moment
    Then exactly one device is linked to the purchase
    And the other request is told the link has expired

  Scenario: A link opened before alerts are on still works afterwards
    Given a Pro purchase and a fresh restore link
    When a device opens the link before turning alerts on
    And it turns alerts on and opens the link again
    Then the first attempt asks it to turn alerts on
    And the second attempt links the device
