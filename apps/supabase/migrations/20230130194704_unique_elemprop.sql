ALTER TABLE element_properties
    ADD CONSTRAINT unique_stepprop_element UNIQUE(step_property_id, element_id);