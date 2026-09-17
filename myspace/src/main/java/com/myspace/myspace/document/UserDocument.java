package com.myspace.myspace.document;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.elasticsearch.annotations.Document;
import org.springframework.data.elasticsearch.annotations.Field;
import org.springframework.data.elasticsearch.annotations.FieldType;
import org.springframework.data.elasticsearch.annotations.Setting;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(indexName = "users", createIndex = false)
@Setting(settingPath = "elasticsearch/settings/default-settings.json")
public class UserDocument {

    @Id
    private Long id;

    @Field(type = FieldType.Keyword)
    private String username;

    @Field(type = FieldType.Text, analyzer = "standard_vi", searchAnalyzer = "standard_vi")
    private String displayName;

    @Field(type = FieldType.Text, analyzer = "standard_vi", searchAnalyzer = "standard_vi")
    private String bio;

    @Field(type = FieldType.Keyword)
    private String avatarUrl;

    @Field(type = FieldType.Keyword)
    private String role;
}
