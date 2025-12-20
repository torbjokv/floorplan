Feature: SVG Editor Interface
  As a user of the floorplan designer
  I want to edit my floor plan directly in the SVG view
  So that I can create designs visually without switching tabs

  Background:
    Given I am on the floorplan designer page
    And localStorage is cleared

  Scenario: Add Room button is visible
    Then the "Add Room" button should be visible in the SVG view

  Scenario: Add Door button is visible
    Then the "Add Door" button should be visible in the SVG view

  Scenario: Add Window button is visible
    Then the "Add Window" button should be visible in the SVG view

  Scenario: Add Object button is visible
    Then the "Add Object" button should be visible in the SVG view

  Scenario: Adding a new room via Add Room button
    When I click the "Add Room" button in the SVG view
    And I wait for 600ms
    Then a new room should appear in the SVG
    And the room should be attached to zeropoint

  Scenario: Dragging a room to reposition it
    Given I have a room in the floorplan
    When I drag the room to a new position
    And I wait for 600ms
    Then the room position should be updated
    And the DSL should reflect the new position

  Scenario: Dragging a door to reposition it on a wall
    Given I have a room with a door
    When I drag the door along the wall
    And I wait for 600ms
    Then the door position should be updated
    And the DSL should reflect the new door offset

  Scenario: Dragging a window to reposition it on a wall
    Given I have a room with a window
    When I drag the window along the wall
    And I wait for 600ms
    Then the window position should be updated
    And the DSL should reflect the new window offset

  Scenario: Dragging an object within a room
    Given I have a room with an object
    When I drag the object to a new position
    And I wait for 600ms
    Then the object position should be updated
    And the DSL should reflect the new object position

  Scenario: Adding a door via Add Door button
    Given I have a room in the floorplan
    When I click the "Add Door" button in the SVG view
    And I wait for 600ms
    Then a new door should appear on the first room
    And the door should be visible in the DSL

  Scenario: Adding a window via Add Window button
    Given I have a room in the floorplan
    When I click the "Add Window" button in the SVG view
    And I wait for 600ms
    Then a new window should appear on the first room
    And the window should be visible in the DSL

  Scenario: Adding an object via Add Object button
    Given I have a room in the floorplan
    When I click the "Add Object" button in the SVG view
    And I wait for 600ms
    Then a new object should appear in the first room
    And the object should be visible in the DSL

  Scenario: Delete room by selecting and pressing Delete key
    Given I have multiple rooms in the floorplan
    When I click on a room to select it
    And I press the Delete key
    And I wait for 600ms
    Then the room should be removed
    And the DSL should not contain the room

  Scenario: Delete door by selecting and pressing Delete key
    Given I have a room with a door
    When I click on the door to select it
    And I press the Delete key
    And I wait for 600ms
    Then the door should be removed
    And the DSL should not contain the door

  Scenario: Delete window by selecting and pressing Delete key
    Given I have a room with a window
    When I click on the window to select it
    And I press the Delete key
    And I wait for 600ms
    Then the window should be removed
    And the DSL should not contain the window

  Scenario: Delete object by selecting and pressing Delete key
    Given I have a room with an object
    When I click on the object to select it
    And I press the Delete key
    And I wait for 600ms
    Then the object should be removed
    And the DSL should not contain the object

  @skip
  Scenario: Grid step configuration via button
    # GUI editor removed - grid is configured via DSL
    When I click the grid settings button in the SVG view
    And I change the grid step to 500
    And I wait for 600ms
    Then the grid step should be updated to 500
    And the preview grid should reflect the new spacing

  Scenario: Dragging a door from one wall to another wall
    Given I have a room with a door on the bottom wall
    When I drag the door to the left wall
    And I wait for 600ms
    Then the door should be on the left wall
    And the DSL should reflect the new door wall

  Scenario: Dragging a window from one wall to another wall
    Given I have a room with a window on the top wall
    When I drag the window to the right wall
    And I wait for 600ms
    Then the window should be on the right wall
    And the DSL should reflect the new window wall

  Scenario: Dragging a door from one room to another room
    Given I have two rooms with a door on the first room
    When I drag the door to the second room
    And I wait for 600ms
    Then the door should be on the second room
    And the DSL should reflect the new door room

  Scenario: Dragging a window from one room to another room
    Given I have two rooms with a window on the first room
    When I drag the window to the second room
    And I wait for 600ms
    Then the window should be on the second room
    And the DSL should reflect the new window room

  Scenario: Dragging an object from one room to another room
    Given I have two rooms with an object in the first room
    When I drag the object to the second room
    And I wait for 600ms
    Then the object should be in the second room
    And the DSL should reflect the new object room

  Scenario: Resizing a room by dragging width handle
    Given I have a room in the floorplan
    When I drag the right edge handle of the room
    And I wait for 600ms
    Then the room width should be updated
    And the DSL should reflect the new room width

  Scenario: Resizing a room by dragging depth handle
    Given I have a room in the floorplan
    When I drag the bottom edge handle of the room
    And I wait for 600ms
    Then the room depth should be updated
    And the DSL should reflect the new room depth

  Scenario: Resizing an object by dragging handle
    Given I have a room with a square object
    When I drag the object resize handle
    And I wait for 600ms
    Then the object size should be updated
    And the DSL should reflect the new object size
