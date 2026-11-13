Feature: An Postaer scene math

  Scenario: The poster prints the same inks every day
    Given the poster
    When I pick the poster inks
    Then the sun ink is the warm orange

  Scenario: Bigger waves lift the band crests
    Given calm and heavy wave heights
    When I lay out the bands for each
    Then every crest sits higher on the heavy day

  Scenario: Wave height is clamped to the poster range
    Given an absurd nine metre reading
    When I compute the band lift
    Then the lift equals the maximum lift

  Scenario: Onshore mess bobs faster than glass
    Given glassy and onshore wind states
    When I compare drift durations
    Then the onshore cycle is shorter

  Scenario: The exported layout stays inside the canvas
    Given an afternoon at half a metre
    When I compute the export layout
    Then every band and text baseline sits within 1080 by 1920

  Scenario: The headline is the wave height, not a verdict
    Given an afternoon at half a metre
    When I compute the export layout
    Then the headline reads the wave height
    And the board line reads as a plain tag
