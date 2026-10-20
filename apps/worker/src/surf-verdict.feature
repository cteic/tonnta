Feature: Ask for the Donabate surf verdict
  Scenario: A current forecast returns the existing verdict explanation
    Given a forecast covering the current hour
    When I ask for the surf verdict
    Then I receive the verdict and its unchanged explanation

  Scenario: Repeated requests use the forecast cache
    Given a forecast covering the current hour
    When I ask for the surf verdict twice
    Then the forecast source is fetched only once

  Scenario: An expired forecast cannot answer today's question
    Given a forecast that ended yesterday
    When I ask for the surf verdict
    Then the request fails without a stale verdict
