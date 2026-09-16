Feature: An Cairt verdict stamps

  Scenario: GO is stamped in notice magenta
    Given a go verdict
    When I resolve the stamp treatment
    Then the stamp ink is notice magenta
    And the stamp is not barred

  Scenario: MAYBE is stamped in sounding ink with no fill
    Given a maybe verdict
    When I resolve the stamp treatment
    Then the stamp ink is sounding ink
    And the stamp fill is transparent

  Scenario: FLAT is stamped in contour grey
    Given a flat verdict
    When I resolve the stamp treatment
    Then the stamp ink is contour grey
    And the stamp is not barred

  Scenario: BLOWN gets the prohibited-anchorage bar
    Given a blown verdict
    When I resolve the stamp treatment
    Then the stamp is barred
    And the stamp ink is warning rust
