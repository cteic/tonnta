Feature: Solar palette engine

  Scenario: A June pre-dawn hour in Donabate is the predawn phase
    Given the clock reads 2026-06-21T03:40:00Z at Donabate
    When I compute the solar scene
    Then the phase is predawn
    And the disc is a moon

  Scenario: A June sunrise hour in Donabate glows
    Given the clock reads 2026-06-21T04:30:00Z at Donabate
    When I compute the solar scene
    Then the phase is sunrise
    And the glow is full

  Scenario: A June midday in Donabate is plain day
    Given the clock reads 2026-06-21T12:00:00Z at Donabate
    When I compute the solar scene
    Then the phase is day
    And the verdict text is dark ink

  Scenario: A June late evening in Donabate is sunset
    Given the clock reads 2026-06-21T19:50:00Z at Donabate
    When I compute the solar scene
    Then the phase is sunset

  Scenario: A December midnight in Donabate is night
    Given the clock reads 2026-12-21T00:00:00Z at Donabate
    When I compute the solar scene
    Then the phase is night
    And the disc is a moon

  Scenario: A December noon in Donabate is still day despite the low sun
    Given the clock reads 2026-12-21T12:00:00Z at Donabate
    When I compute the solar scene
    Then the phase is day

  Scenario: The sky gradient always ends in water
    Given the clock reads 2026-06-21T12:00:00Z at Donabate
    When I compute the solar scene
    Then the gradient ends with the water colour
