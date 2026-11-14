Feature: Choosing what an alert announces

  Scenario: The alert names the next window, not the longest
    Given a two-hour GO window this afternoon and a four-hour one tomorrow morning
    When the alert check runs at noon
    Then it announces the afternoon window

  Scenario: A window that has ended is not announced
    Given a GO window this morning and nothing after it
    When the alert check runs at noon
    Then it announces nothing

  Scenario: A window more than a day away is not announced
    Given a GO window starting the day after tomorrow
    When the alert check runs at noon
    Then it announces nothing

  Scenario: Unsubscribing needs only the endpoint
    Then a body with only an endpoint is accepted and a body without one is rejected

  Scenario: A window already under way is described by the hour still to come
    Given a GO window that started at nine and runs to three
    When the alert check runs at noon
    Then the alert describes the noon hour

  Scenario: A subscriber is not alerted twice for a window announced a day ahead
    Given a subscriber alerted 13 hours ago
    Then they are still cooling down
    And a subscriber alerted 25 hours ago is not

  Scenario: Only push service endpoints can subscribe
    Then an https push service endpoint is accepted
    And an http endpoint, any other host and a malformed URL are rejected
