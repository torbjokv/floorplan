@skip
Feature: Architectural Elements
  As a user of the floorplan designer
  I want to add doors and windows to my floor plan
  So that I can create complete architectural designs

  Background:
    Given I am on the floorplan designer page
    And localStorage is cleared
    And I have a room named "Living Room" with dimensions 4000x3000

  Scenario: Adding a door to a room wall
    When I add a door to "Living Room:bottom" at offset 1000 with width 800
    Then the door should be visible on the bottom wall
    And the door should be 800mm wide
    And the door should be positioned 1000mm from the wall start

  Scenario: Door with swing arc - inwards right
    When I add a door with swing "inwards-right"
    Then a swing arc should be visible
    And the arc should indicate inward opening
    And the hinge should be on the right side

  Scenario: Door with swing arc - inwards left
    When I add a door with swing "inwards-left"
    Then a swing arc should be visible
    And the arc should indicate inward opening
    And the hinge should be on the left side

  Scenario: Door with swing arc - outwards right
    When I add a door with swing "outwards-right"
    Then a swing arc should be visible
    And the arc should indicate outward opening
    And the hinge should be on the right side

  Scenario: Door with swing arc - outwards left
    When I add a door with swing "outwards-left"
    Then a swing arc should be visible
    And the arc should indicate outward opening
    And the hinge should be on the left side

  Scenario: Door type - normal with swing arc
    When I add a door with type "normal"
    Then the door should display a swing arc
    And the swing arc should be visible

  Scenario: Door type - opening without swing arc
    When I add a door with type "opening"
    Then the door should be visible
    But no swing arc should be displayed

  Scenario: Door on different wall positions
    When I add doors to all four walls of "Living Room"
    Then doors should appear on top, bottom, left, and right walls
    And each door should be correctly rotated for its wall
    And all doors should be visible

  Scenario: Door with zero offset
    When I add a door at offset 0
    Then the door should start at the wall's beginning
    And the door should be visible and positioned correctly

  Scenario: Adding a window to a room wall
    When I add a window to "Living Room:top" at offset 1000 with width 1200
    Then the window should be visible on the top wall
    And the window should be 1200mm wide
    And the window should be positioned 1000mm from the wall start

  Scenario: Windows on different walls
    When I add windows to all four walls of "Living Room"
    Then windows should appear on top, bottom, left, and right walls
    And each window should be correctly rotated for its wall
    And all windows should be visible

  Scenario: Multiple doors on same wall
    When I add 2 doors to "Living Room:bottom"
    Then both doors should be visible on the bottom wall
    And the doors should not overlap
    And each door should be at its specified offset

  Scenario: Multiple windows on same wall
    When I add 3 windows to "Living Room:top"
    Then all 3 windows should be visible on the top wall
    And the windows should not overlap

  Scenario: Door and window on same wall
    When I add a door and a window to "Living Room:left"
    Then both door and window should be visible
    And they should be correctly positioned on the left wall

  Scenario: Fixed thickness for doors (100mm)
    When I add a door with any width
    Then the door thickness should be 100mm
    And the thickness should be consistent across all walls

  Scenario: Fixed thickness for windows (100mm)
    When I add a window with any width
    Then the window thickness should be 100mm
    And the thickness should be consistent across all walls

  Scenario: Door on composite room part
    Given I have a composite room with 2 parts
    When I add a door to the second part's wall
    Then the door should be visible on the correct part
    And the door should be correctly positioned

  Scenario: Error for door on non-existent room
    When I try to add a door to "NonExistentRoom:bottom"
    And I wait for 600ms
    Then an error should be displayed
    And the error should mention the invalid room reference

  Scenario: Error for window on non-existent room
    When I try to add a window to "FakeRoom:top"
    And I wait for 600ms
    Then an error should be displayed
    And the error should mention the invalid room reference
