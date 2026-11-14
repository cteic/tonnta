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
