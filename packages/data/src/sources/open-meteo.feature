Feature: Reading the Open-Meteo forecast

  Scenario: Missing values drop only the hours they affect
    Given a forecast of three hours where the second has no wave height and the third has no sea temperature
    When the forecast is fetched for Donabate
    Then it returns the first and third hours
    And only the first hour has a sea temperature
