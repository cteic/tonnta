Feature: Theme registry

  Scenario: An unknown stored value falls back to the default theme
    Given a stored theme value of neon-disco
    When I resolve the theme id
    Then the resolved id is eiri

  Scenario: A missing stored value falls back to the default theme
    Given no stored theme value
    When I resolve the theme id
    Then the resolved id is eiri

  Scenario: A valid stored value is honoured
    Given a stored theme value of dawn-v1
    When I resolve the theme id
    Then the resolved id is dawn-v1

  Scenario: The legacy theme keeps the launch palette
    Given the dawn-v1 theme
    When I read its tokens
    Then the surface is the launch card colour
