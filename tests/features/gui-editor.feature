Feature: GUI Editor Interface
  As a user of the floorplan designer
  I want to edit my floor plan using a graphical interface
  So that I can create designs without writing JSON

  Background:
    Given I am on the floorplan designer page
    And localStorage is cleared

  Scenario: GUI editor is visible by default
    Then the GUI editor should be visible
    And the GUI editor should show grid settings
    And the GUI editor should show room management section

  Scenario: Grid step configuration in GUI
    When I change the grid step to 500 in the GUI
    And I wait for 600ms
    Then the grid step should be updated to 500
    And the preview grid should reflect the new spacing

  Scenario: Adding a new room via GUI
    When I click "Add Room" in the GUI editor
    Then a new room should be added to the list
    And the room should have an auto-generated ID
    And the room should have default values

  Scenario: Editing room name in GUI
    Given I have a room in the GUI editor
    When I change the room name to "Master Bedroom"
    Then the room name should update
    And the preview should show the new name

  Scenario: Editing room dimensions in GUI
    Given I have a room in the GUI editor
    When I set width to 5000 and depth to 4000
    Then the room dimensions should update
    And the preview should reflect the new size

  Scenario: Room anchor selector dropdown
    Given I have a room in the GUI editor
    When I select a different room to attach to
    Then anchor corner selector should appear
    And I should be able to select a corner

  Scenario: Zero Point attachment in GUI
    Given I have a room in the GUI editor
    When I select "Zero Point" in the attachTo dropdown
    Then the corner selector should be hidden
    And the room should attach to zero point

  Scenario: Collapsible coordinate fields
    Given I have a room in the GUI editor
    When the room uses attachTo positioning
    Then offset fields should be visible
    And absolute x/y fields should show offset values

  Scenario: Room objects editor in GUI
    Given I have a room in the GUI editor
    When I add a room object
    Then object configuration fields should appear
    And I should be able to set object type, position, and properties

  Scenario: Room object type selection (square/circle)
    Given I have a room in the GUI editor
    When I add a room object
    And I select object type "square"
    Then width and height fields should be visible
    When I change object type to "circle"
    Then radius field should be visible instead

  Scenario: Room object dual anchor system in GUI
    When I configure a room object
    Then I should see object anchor selector
    And I should see room anchor selector
    And both anchors should be configurable

  Scenario: Door configuration in GUI
    When I navigate to the doors section
    And I add a new door
    Then door configuration fields should appear
    And I should be able to select room and wall

  Scenario: Door type selection in GUI
    Given I have a door in the GUI editor
    When I select type "normal"
    Then swing direction options should be visible
    When I select type "opening"
    Then swing direction should be hidden

  Scenario: Door swing direction dropdown
    Given I have a door with type "normal"
    Then I should see swing direction options
    And options should include inwards-left, inwards-right, outwards-left, outwards-right

  Scenario: Window configuration in GUI
    When I navigate to the windows section
    And I add a new window
    Then window configuration fields should appear
    And I should be able to set room, wall, width, and offset

  Scenario: Deleting a room via GUI
    Given I have 2 rooms in the GUI editor
    When I click delete on the first room
    Then the room should be removed from the list
    And the preview should update without that room

  Scenario: Deleting a door via GUI
    Given I have a door configured
    When I click delete on the door
    Then the door should be removed
    And the preview should update

  Scenario: Deleting a window via GUI
    Given I have a window configured
    When I click delete on the window
    Then the window should be removed
    And the preview should update

  Scenario: Room list with scroll to functionality
    Given I have 10 rooms in the floor plan
    When I click on a room in the SVG preview
    Then the GUI editor should scroll to that room's configuration
    And the room's section should be visible

  Scenario: Collapsible room sections
    Given I have multiple rooms configured
    When I click to collapse a room section
    Then the room details should hide
    And only the room header should be visible
    When I click to expand
    Then the room details should be visible again

  Scenario: Data-room-id attributes for targeting
    Given I have rooms configured in GUI
    Then each room section should have data-room-id attribute
    And the attribute should match the room's ID

  Scenario: Composite room parts in GUI
    When I add a composite room with parts
    Then each part should have its own configuration section
    And parts should be visually grouped under the parent room
    And parts can attach to parent or other parts

  Scenario: Dark theme UI
    Then the GUI editor should use dark theme colors
    And text should be readable on dark background
    And form elements should match the dark theme

  Scenario: Real-time synchronization with JSON
    When I change a value in the GUI editor
    And I wait for 600ms
    Then the JSON editor should reflect the change
    When I switch to the JSON tab
    Then the JSON should contain the updated value

  Scenario: Validation feedback in GUI
    When I enter an invalid value in the GUI
    Then validation feedback should appear
    And the field should indicate the error

  Scenario: Room name dropdown for doors/windows
    When I configure a door
    Then the room selector should show available rooms
    And the list should be populated from existing rooms

  Scenario: Wall position selector for doors/windows
    When I select a room for a door
    Then wall position options should be available
    And options should be top, bottom, left, right
