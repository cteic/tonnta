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

  Scenario: The sky ends at the horizon on its last stop
    Given the clock reads 2026-06-21T12:00:00Z at Donabate
    When I compute the solar scene
    Then the sky gradient ends with the last sky stop at 100%

  Scenario: A rising sun sits just above the horizon
    Given the clock reads 2026-11-27T08:20:00Z at Donabate
    When I compute the solar scene
    Then the phase is sunrise
    And the disc sits between 6px and 30px above the horizon

  Scenario: A moon at night sits on the horizon
    Given the clock reads 2026-11-27T02:00:00Z at Donabate
    When I compute the solar scene
    Then the disc is a moon
    And the disc sits 6px above the horizon

  Scenario: The highest sun lifts no more than 156px
    Given the clock reads 2026-06-21T12:00:00Z at Donabate
    When I compute the solar scene
    Then the disc sits 156px above the horizon
