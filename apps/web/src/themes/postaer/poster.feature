Feature: An Postaer scene math

  Scenario: A GO day prints the sunny inks
    Given a go verdict
    When I pick the poster inks
    Then the sun ink is the warm orange

  Scenario: A blown-out day shifts to wet-day inks
    Given a blown verdict
    When I pick the poster inks
    Then the sun ink is grey-green

  Scenario: Every verdict has an Irish headline
    Given the four verdicts
    When I read the headlines
    Then go reads TÉIGH! and blown reads SÉIDTE

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
    Given a go afternoon at half a metre
    When I compute the export layout
    Then every band and text baseline sits within 1080 by 1920

  Scenario: Long Irish headlines set smaller
    Given a maybe verdict
    When I compute the export layout
    Then the headline size is reduced
