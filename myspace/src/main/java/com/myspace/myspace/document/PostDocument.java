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

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(indexName = "posts", createIndex = true)
@Setting(settingPath = "elasticsearch/settings/default-settings.json")
public class PostDocument {

    @Id
    private Long id;

    @Field(type = FieldType.Text, analyzer = "standard_vi", searchAnalyzer = "standard_vi")
    private String title;

    @Field(type = FieldType.Text, analyzer = "standard_vi", searchAnalyzer = "standard_vi")
    private String excerpt;

    @Field(type = FieldType.Text, analyzer = "standard_vi", searchAnalyzer = "standard_vi")
    private String tag;

    @Field(type = FieldType.Keyword)
    private String slug;

    @Field(type = FieldType.Keyword)
    private String coverImageUrl;

    // Denormalized author info (no JOIN needed at search time)
    @Field(type = FieldType.Long)
    private Long authorId;

    @Field(type = FieldType.Keyword)
    private String authorUsername;

    @Field(type = FieldType.Text, analyzer = "standard")
    private String authorDisplayName;

    @Field(type = FieldType.Keyword)
    private String authorAvatarUrl;

    @Field(type = FieldType.Integer)
    private Integer viewCount;

    @Field(type = FieldType.Integer)
    private Integer likeCount;

    @Field(type = FieldType.Date)
    private LocalDateTime publishedAt;
}
