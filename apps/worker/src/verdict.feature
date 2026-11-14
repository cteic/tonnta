Feature: Verdict timeline for the home-screen widgets

  Scenario: The timeline starts at the current hour and covers a day
    Given a seven-day forecast that began at midnight
    When I build the timeline at 09:20
    Then the first hour is 09:00
    And the timeline has 24 hours

  Scenario: Every hour carries the verdict engine's own result
    Given a seven-day forecast that began at midnight
    When I build the timeline at 09:20
    Then each hour's verdict, board and reason match the verdict engine

  Scenario: A cached timeline for the same hour is served without a forecast fetch
    Given a timeline cached for the current hour
    When the widget asks for the verdict
    Then the response is the cached timeline
    And no forecast was fetched

  Scenario: A cache miss fetches the forecast and caches the result
    Given an empty cache
    When the widget asks for the verdict
    Then the response has 24 hours
    And the timeline is cached for the current hour

  Scenario: An unknown spot is not found
    Given an empty cache
    When the widget asks for the verdict at spot "atlantis"
    Then the response status is 404

  Scenario: A forecast failure is reported as a bad gateway
    Given an empty cache and a forecast that fails
    When the widget asks for the verdict
    Then the response status is 502
