Feature: SVG Rendering and Visualization
  As a user of the floorplan designer
  I want to see a live preview of my floor plan
  So that I can visualize my design in real-time

  Background:
    Given I am on the floorplan designer page
    And localStorage is cleared

  Scenario: SVG preview is visible on page load
    Then the SVG preview should be visible
    And the SVG should have a valid viewBox

  Scenario: Dynamic viewBox calculation based on content
    When I create a room with dimensions 4000x3000 at position 0,0
    Then the viewBox should encompass the room with padding
    And the viewBox should include 10% padding around content

  Scenario: ViewBox updates when adding new rooms
    Given I have a room at 0,0 with size 2000x2000
    When I add another room at 5000,5000 with size 2000x2000
    And I wait for 600ms
    Then the viewBox should expand to include both rooms
    And both rooms should be visible in the preview

  Scenario: Grid overlay is visible
    When I set grid_step to 1000
    And I wait for 600ms
    Then a grid overlay should be visible
    And grid lines should be spaced 1000mm apart

  Scenario: Grid step configuration
    When I change grid_step from 1000 to 500
    And I wait for 600ms
    Then the grid spacing should update to 500mm
    And the grid should be denser

  Scenario: Room labels are centered
    When I create a room named "Master Bedroom"
    Then the room label should display "Master Bedroom"
    And the label should be centered within the room rectangle
    And the label should be visible

  Scenario: Room rendering with borders
    When I create a room
    Then the room should have a visible border
    And the room should be filled with the default color
    And the border should be clearly distinguishable

  Scenario: Composite room unified rendering
    When I create a composite room with 3 parts
    Then the composite room should appear as one unified shape
    And internal borders between adjacent parts should not be visible
    And external borders should be visible
    And the composite room should look seamless

  Scenario: Hover effects on rooms
    When I hover over a room in the preview
    Then the room should highlight
    And the cursor should indicate interactivity

  Scenario: Hover effects on composite rooms
    Given I have a composite room with 2 parts
    When I hover over any part of the composite room
    Then all parts should highlight together
    And the entire composite room should indicate it's one unit

  Scenario: Interactive room click scrolls to GUI editor
    Given I am viewing the floorplan preview
    When I click on a room in the SVG
    Then the GUI editor should scroll to that room's configuration
    And the room's fields should be visible

  Scenario: Update animation indicator
    When I modify the JSON
    And I wait for 600ms
    Then an update indicator should briefly appear
    And the indicator should confirm the render updated

  Scenario: Room objects rendered on top
    Given I have a room with 2 room objects
    When the floorplan renders
    Then the room objects should appear on top of the room
    And the objects should be visible and not obscured

  Scenario: Room objects - square type
    When I add a square object to a room
    Then the square should be rendered with correct dimensions
    And the square should have the specified color
    And the square should display the text label if provided

  Scenario: Room objects - circle type
    When I add a circle object to a room
    Then the circle should be rendered with correct radius
    And the circle should have the specified color
    And the circle should display the text label if provided

  Scenario: Room object dual anchor system
    When I add an object with anchor "top-left" and roomAnchor "bottom-right"
    Then the object's top-left should align with room's bottom-right
    And the object should be positioned correctly relative to the room

  Scenario: Coordinate system verification (0,0 is top-left)
    When I create a room at coordinates 0,0
    Then the room should appear at the top-left of the viewBox
    And the coordinate system origin should be verified

  Scenario: Y-axis increases downward
    When I create a room at y=0 and another at y=3000
    Then the second room should be below the first room
    And the SVG coordinate system should be confirmed

  Scenario: Measurements in millimeters
    When I create a room with width 4000 and depth 3000
    Then the room should be 4000mm wide
    And the room should be 3000mm deep
    And the display scale should be 2:1 (1mm = 0.2px)

  Scenario: Rendering with missing rooms (partial errors)
    When I have 3 rooms and 1 has a positioning error
    Then the 2 valid rooms should render successfully
    And the invalid room should not appear
    And an error should be displayed for the missing room

  Scenario: Empty floorplan (no rooms)
    When I create a floorplan with no rooms
    Then the SVG should still be visible
    And a grid should be displayed
    And no rooms should be rendered

  Scenario: Large floor plan performance (50+ rooms)
    When I create a floorplan with 50 rooms
    And I wait for updates to complete
    Then all 50 rooms should be visible
    And the render should complete within acceptable time
    And the viewBox should encompass all rooms
