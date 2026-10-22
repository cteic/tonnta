Feature: Donabate verdict engine

  Scenario: Clean waves over the go threshold with light offshore wind is a GO
    Given 0.6m waves at 5s with 12km/h wind from the west-southwest
    When I assess the hour for Donabate
    Then the verdict should be go
    And the board should be longboard

  Scenario: Rideable waves with strong onshore wind is blown out
    Given 0.8m waves at 4s with 40km/h wind from the east
    When I assess the hour for Donabate
    Then the verdict should be blown

  Scenario: Under 0.3m is flat
    Given 0.2m waves at 3s with 20km/h wind from the west
    When I assess the hour for Donabate
    Then the verdict should be flat

  Scenario: Flat and glassy recommends the SUP
    Given 0.2m waves at 3s with 5km/h wind from the west
    When I assess the hour for Donabate
    Then the verdict should be flat
    And the board should be sup

  Scenario: Waves at threshold with marginal wind is a maybe
    Given 0.5m waves at 4s with 28km/h wind from the north
    When I assess the hour for Donabate
    Then the verdict should be maybe

  Scenario: Offshore wind earns the higher wind allowance
    Given 0.5m waves at 4s with 28km/h wind from the west-southwest
    When I assess the hour for Donabate
    Then the verdict should be go

  Scenario: Small rideable waves pick the foamie
    Given 0.45m waves at 4s with 15km/h wind from the west-southwest
    When I assess the hour for Donabate
    Then the verdict should be go
    And the board should be foamie

  Scenario: Wind from the west-southwest is offshore at Donabate
    Given a 12km/h wind from 250 degrees
    When I classify the wind for Donabate
    Then the wind state should be offshore

  Scenario: Wind from the east-northeast is onshore at Donabate
    Given a 25km/h wind from 70 degrees
    When I classify the wind for Donabate
    Then the wind state should be onshore

  Scenario: Wind under 8km/h is glassy regardless of direction
    Given a 5km/h wind from 70 degrees
    When I classify the wind for Donabate
    Then the wind state should be glassy

  Scenario: A spot's own flat threshold names its own height
    Given 0.5m waves at 4s with 12km/h wind at El Cotillo, which goes flat below 0.6m
    When I assess the hour for El Cotillo
    Then the verdict should be flat because it is under 0.6m
